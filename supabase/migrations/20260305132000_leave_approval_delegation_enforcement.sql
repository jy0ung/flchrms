BEGIN;

CREATE OR REPLACE FUNCTION public.leave_stage_required_role(_stage text)
RETURNS public.app_role
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE _stage
      WHEN 'manager' THEN 'manager'::public.app_role
      WHEN 'general_manager' THEN 'general_manager'::public.app_role
      WHEN 'director' THEN 'director'::public.app_role
      ELSE NULL
    END
$$;

REVOKE ALL ON FUNCTION public.leave_stage_required_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_stage_required_role(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_active_approval_delegator(
  _delegate_user_id uuid,
  _required_role public.app_role,
  _as_of timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT d.delegator_user_id
  FROM public.leave_delegations d
  JOIN public.user_roles ur
    ON ur.user_id = d.delegator_user_id
  WHERE d.delegate_user_id = _delegate_user_id
    AND d.status = 'active'
    AND d.scope IN ('leave_approval', 'full')
    AND d.valid_from <= _as_of
    AND d.valid_to >= _as_of
    AND ur.role = _required_role
  ORDER BY d.valid_to DESC, d.created_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.leave_get_active_approval_delegator(uuid, public.app_role, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_active_approval_delegator(uuid, public.app_role, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.approve_leave_request(
  _request_id uuid,
  _action text,
  _rejection_reason text DEFAULT NULL,
  _manager_comments text DEFAULT NULL,
  _document_required boolean DEFAULT false,
  _expected_status text DEFAULT NULL
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
  _stage_index int;
  _is_final boolean;
  _result RECORD;
  _required_role app_role;
  _delegated_from_user_id uuid;
BEGIN
  IF _action NOT IN ('approve', 'reject', 'request_document') THEN
    RAISE EXCEPTION 'Invalid action: %. Must be approve, reject, or request_document.', _action;
  END IF;

  SELECT role INTO _approver_role
    FROM user_roles
   WHERE user_id = _approver_id;

  IF _approver_role IS NULL THEN
    RAISE EXCEPTION 'Approver role not found. Only authenticated users with a role can process leave requests.';
  END IF;

  SELECT * INTO _req
    FROM leave_requests
   WHERE id = _request_id
   FOR UPDATE;

  IF _req IS NULL THEN
    RAISE EXCEPTION 'Leave request not found.';
  END IF;

  IF _expected_status IS NOT NULL AND _req.status != _expected_status THEN
    RAISE EXCEPTION 'Leave request status has changed (expected: %, actual: %). Please refresh and try again.',
      _expected_status, _req.status;
  END IF;

  IF _req.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot process a leave request that is already %.', _req.status;
  END IF;
  IF _req.final_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'This leave request has already been fully approved.';
  END IF;

  IF _req.employee_id = _approver_id THEN
    RAISE EXCEPTION 'You cannot approve or reject your own leave request.';
  END IF;

  SELECT role INTO _requester_role
    FROM user_roles
   WHERE user_id = _req.employee_id;

  _requester_role := COALESCE(_requester_role, 'employee');

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

  IF _requester_role IN ('manager', 'general_manager') THEN
    _workflow_stages := array_remove(_workflow_stages, 'manager');
  END IF;
  IF _requester_role IN ('director', 'hr', 'admin') THEN
    _workflow_stages := ARRAY(SELECT stage FROM unnest(_workflow_stages) AS stage WHERE stage = 'director');
  END IF;

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
    _next_stage := NULL;
  END IF;

  IF _next_stage IS NULL AND _action != 'reject' THEN
    RAISE EXCEPTION 'No further approval stage required for this leave request.';
  END IF;

  IF _action = 'request_document' THEN
    IF _req.status != 'pending' THEN
      RAISE EXCEPTION 'Only managers can request documents for pending leave requests.';
    END IF;

    IF _approver_role != 'manager' THEN
      _delegated_from_user_id := public.leave_get_active_approval_delegator(
        _approver_id,
        'manager'::app_role,
        _now
      );

      IF _delegated_from_user_id IS NULL THEN
        RAISE EXCEPTION 'Only managers can request documents for pending leave requests.';
      END IF;
    END IF;

    UPDATE leave_requests SET
      document_required = true,
      manager_comments = COALESCE(_manager_comments, 'Please provide supporting documentation.'),
      updated_at = _now
    WHERE id = _request_id;

    SELECT * INTO _result FROM leave_requests WHERE id = _request_id;
    RETURN row_to_json(_result);
  END IF;

  _required_role := public.leave_stage_required_role(_next_stage);
  IF _required_role IS NOT NULL AND _approver_role != _required_role THEN
    _delegated_from_user_id := public.leave_get_active_approval_delegator(
      _approver_id,
      _required_role,
      _now
    );

    IF _delegated_from_user_id IS NULL THEN
      IF _required_role = 'manager' THEN
        RAISE EXCEPTION 'Only a manager can % at this stage.', _action;
      ELSIF _required_role = 'general_manager' THEN
        RAISE EXCEPTION 'Only a general manager can % at this stage.', _action;
      ELSIF _required_role = 'director' THEN
        RAISE EXCEPTION 'Only a director can % at this stage.', _action;
      END IF;
    END IF;
  END IF;

  IF _action = 'reject' THEN
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

  _stage_index := array_position(_workflow_stages, _next_stage);
  _is_final := (_stage_index IS NOT NULL AND _stage_index = array_length(_workflow_stages, 1));

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

GRANT EXECUTE ON FUNCTION public.approve_leave_request(uuid, text, text, text, boolean, text) TO authenticated;

COMMIT;
