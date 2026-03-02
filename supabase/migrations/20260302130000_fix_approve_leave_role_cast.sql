-- Migration: Fix type cast in approve_leave_request RPC
-- The final_approved_by_role column is of type app_role (enum),
-- but the function assigned text literals without explicit casts,
-- causing error 42804 on approval.

CREATE OR REPLACE FUNCTION public.approve_leave_request(
  _request_id uuid,
  _action text,                     -- 'approve' | 'reject' | 'request_document'
  _rejection_reason text DEFAULT NULL,
  _manager_comments text DEFAULT NULL,
  _document_required boolean DEFAULT false,
  _expected_status text DEFAULT NULL -- optimistic lock: reject if status changed
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _approver_id uuid := auth.uid();
  _approver_role app_role;
  _req RECORD;
  _requester_role app_role;
  _now timestamptz := now();
  _workflow_stages text[];
  _next_stage text;
  _effective_route text[];
  _stage_index int;
  _is_final boolean;
  _update_data jsonb;
  _result RECORD;
BEGIN
  -- Validate action
  IF _action NOT IN ('approve', 'reject', 'request_document') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be approve, reject, or request_document.', _action;
  END IF;

  -- Get approver's role
  SELECT role INTO _approver_role
    FROM user_roles
   WHERE user_id = _approver_id;

  IF _approver_role IS NULL THEN
    RAISE EXCEPTION 'Approver role not found. Only authenticated users with a role can process leave requests.';
  END IF;

  -- Lock and fetch the leave request row (FOR UPDATE prevents concurrent modifications)
  SELECT * INTO _req
    FROM leave_requests
   WHERE id = _request_id
   FOR UPDATE;

  IF _req IS NULL THEN
    RAISE EXCEPTION 'Leave request not found.';
  END IF;

  -- Optimistic lock: if caller expected a specific status, verify it hasn't changed
  IF _expected_status IS NOT NULL AND _req.status != _expected_status THEN
    RAISE EXCEPTION 'Leave request status has changed (expected: %, actual: %). Please refresh and try again.',
      _expected_status, _req.status;
  END IF;

  -- Cannot process already-resolved requests
  IF _req.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot process a leave request that is already %.', _req.status;
  END IF;
  IF _req.final_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'This leave request has already been fully approved.';
  END IF;

  -- Prevent approving own leave
  IF _req.employee_id = _approver_id THEN
    RAISE EXCEPTION 'You cannot approve or reject your own leave request.';
  END IF;

  -- Get the requester's role
  SELECT role INTO _requester_role
    FROM user_roles
   WHERE user_id = _req.employee_id;

  _requester_role := COALESCE(_requester_role, 'employee');

  -- Resolve workflow stages from snapshot or workflow table
  _workflow_stages := _req.approval_route_snapshot;

  IF _workflow_stages IS NULL OR array_length(_workflow_stages, 1) IS NULL THEN
    SELECT approval_stages INTO _workflow_stages
      FROM leave_approval_workflows
     WHERE requester_role = 'employee'
       AND is_active = true
       AND (department_id = (SELECT department_id FROM profiles WHERE id = _req.employee_id)
            OR department_id IS NULL)
     ORDER BY department_id NULLS LAST
     LIMIT 1;
  END IF;

  -- Default workflow if none configured
  IF _workflow_stages IS NULL OR array_length(_workflow_stages, 1) IS NULL THEN
    CASE _requester_role
      WHEN 'employee' THEN _workflow_stages := ARRAY['manager', 'general_manager', 'director'];
      WHEN 'manager' THEN _workflow_stages := ARRAY['general_manager', 'director'];
      WHEN 'general_manager' THEN _workflow_stages := ARRAY['general_manager', 'director'];
      WHEN 'director' THEN _workflow_stages := ARRAY['director'];
      WHEN 'hr' THEN _workflow_stages := ARRAY['director'];
      WHEN 'admin' THEN _workflow_stages := ARRAY['director'];
      ELSE _workflow_stages := ARRAY['manager', 'general_manager', 'director'];
    END CASE;
  END IF;

  -- Adapt stages for requester role (e.g. a manager's leave skips manager stage)
  IF _requester_role IN ('manager', 'general_manager') THEN
    _workflow_stages := array_remove(_workflow_stages, 'manager');
  END IF;
  IF _requester_role IN ('director', 'hr', 'admin') THEN
    _workflow_stages := ARRAY(SELECT unnest FROM unnest(_workflow_stages) WHERE unnest = 'director');
  END IF;

  -- Determine the next required approval stage
  IF _req.status = 'pending' THEN
    _next_stage := _workflow_stages[1];
  ELSIF _req.status = 'manager_approved' THEN
    _stage_index := array_position(_workflow_stages, 'manager');
    IF _stage_index IS NOT NULL AND _stage_index < array_length(_workflow_stages, 1) THEN
      _next_stage := _workflow_stages[_stage_index + 1];
    END IF;
  ELSIF _req.status = 'gm_approved' THEN
    _stage_index := array_position(_workflow_stages, 'general_manager');
    IF _stage_index IS NOT NULL AND _stage_index < array_length(_workflow_stages, 1) THEN
      _next_stage := _workflow_stages[_stage_index + 1];
    END IF;
  ELSIF _req.status = 'director_approved' THEN
    _next_stage := NULL; -- already fully approved
  END IF;

  IF _next_stage IS NULL AND _action != 'reject' THEN
    RAISE EXCEPTION 'No further approval stage required for this leave request.';
  END IF;

  -- Handle document request (manager only, pending only)
  IF _action = 'request_document' THEN
    IF _approver_role != 'manager' OR _req.status != 'pending' THEN
      RAISE EXCEPTION 'Only managers can request documents for pending leave requests.';
    END IF;

    UPDATE leave_requests SET
      document_required = true,
      manager_comments = COALESCE(_manager_comments, 'Please provide supporting documentation.'),
      updated_at = _now
    WHERE id = _request_id;

    SELECT * INTO _result FROM leave_requests WHERE id = _request_id;
    RETURN row_to_json(_result);
  END IF;

  -- Handle rejection
  IF _action = 'reject' THEN
    -- Verify the approver can act at the current stage
    IF _next_stage = 'manager' AND _approver_role != 'manager' THEN
      RAISE EXCEPTION 'Only a manager can reject at this stage.';
    ELSIF _next_stage = 'general_manager' AND _approver_role != 'general_manager' THEN
      RAISE EXCEPTION 'Only a general manager can reject at this stage.';
    ELSIF _next_stage = 'director' AND _approver_role != 'director' THEN
      RAISE EXCEPTION 'Only a director can reject at this stage.';
    END IF;

    UPDATE leave_requests SET
      status = 'rejected',
      rejected_by = _approver_id,
      rejected_at = _now,
      rejection_reason = _rejection_reason,
      document_required = COALESCE(_document_required, false),
      manager_comments = _manager_comments,
      final_approved_at = NULL,
      final_approved_by = NULL,
      final_approved_by_role = NULL,
      updated_at = _now
    WHERE id = _request_id;

    SELECT * INTO _result FROM leave_requests WHERE id = _request_id;
    RETURN row_to_json(_result);
  END IF;

  -- Handle approval — verify the approver has the right role for the next stage
  IF _next_stage = 'manager' AND _approver_role != 'manager' THEN
    RAISE EXCEPTION 'Only a manager can approve at this stage.';
  ELSIF _next_stage = 'general_manager' AND _approver_role != 'general_manager' THEN
    RAISE EXCEPTION 'Only a general manager can approve at this stage.';
  ELSIF _next_stage = 'director' AND _approver_role != 'director' THEN
    RAISE EXCEPTION 'Only a director can approve at this stage.';
  END IF;

  -- Determine if this is the final approval in the workflow
  _stage_index := array_position(_workflow_stages, _next_stage);
  _is_final := (_stage_index IS NOT NULL AND _stage_index = array_length(_workflow_stages, 1));

  -- Apply the approval
  IF _next_stage = 'manager' THEN
    UPDATE leave_requests SET
      status = 'manager_approved',
      manager_approved_by = _approver_id,
      manager_approved_at = _now,
      manager_comments = _manager_comments,
      document_required = false,
      final_approved_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      final_approved_by = CASE WHEN _is_final THEN _approver_id ELSE NULL END,
      final_approved_by_role = CASE WHEN _is_final THEN 'manager'::app_role ELSE NULL END,
      hr_notified_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      updated_at = _now
    WHERE id = _request_id;

  ELSIF _next_stage = 'general_manager' THEN
    UPDATE leave_requests SET
      status = 'gm_approved',
      gm_approved_by = _approver_id,
      gm_approved_at = _now,
      manager_comments = COALESCE(_manager_comments, manager_comments),
      document_required = false,
      final_approved_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      final_approved_by = CASE WHEN _is_final THEN _approver_id ELSE NULL END,
      final_approved_by_role = CASE WHEN _is_final THEN 'general_manager'::app_role ELSE NULL END,
      hr_notified_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      updated_at = _now
    WHERE id = _request_id;

  ELSIF _next_stage = 'director' THEN
    UPDATE leave_requests SET
      status = 'director_approved',
      director_approved_by = _approver_id,
      director_approved_at = _now,
      manager_comments = COALESCE(_manager_comments, manager_comments),
      document_required = false,
      final_approved_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      final_approved_by = CASE WHEN _is_final THEN _approver_id ELSE NULL END,
      final_approved_by_role = CASE WHEN _is_final THEN 'director'::app_role ELSE NULL END,
      hr_notified_at = CASE WHEN _is_final THEN _now ELSE NULL END,
      updated_at = _now
    WHERE id = _request_id;
  END IF;

  SELECT * INTO _result FROM leave_requests WHERE id = _request_id;
  RETURN row_to_json(_result);
END;
$$;
