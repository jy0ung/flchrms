-- =============================================================================
-- Leave Cancellation Governance v2
-- =============================================================================
-- Adds an explicit cancellation decision RPC with:
-- 1) deterministic stale-status errors for optimistic UI workflows
-- 2) deterministic stage-mismatch errors for approval-stage enforcement
-- 3) leave_request_decisions audit entries for cancellation approvals/rejections
-- =============================================================================

CREATE OR REPLACE FUNCTION public.leave_decide_cancellation_request_v2(
  _request_id uuid,
  _action text,
  _decision_reason text DEFAULT NULL,
  _comments text DEFAULT NULL,
  _expected_cancellation_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  requester_role public.app_role;
  employee_role public.app_role;
  before_row public.leave_requests%ROWTYPE;
  after_row public.leave_requests%ROWTYPE;
  cancellation_route text[];
  current_stage text;
  next_stage text;
  route_len integer;
  next_stage_index integer;
  is_final_stage boolean := false;
  now_ts timestamptz := now();
  normalized_reason text := NULLIF(btrim(COALESCE(_decision_reason, '')), '');
  normalized_comments text := NULLIF(btrim(COALESCE(_comments, '')), '');
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required.'
      USING ERRCODE = '22023';
  END IF;

  IF _action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid cancellation decision action: %', _action
      USING ERRCODE = '22023';
  END IF;

  SELECT public.get_user_role(requester_id)
  INTO requester_role;

  IF requester_role IS NULL THEN
    RAISE EXCEPTION 'Approver role not found.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO before_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_leave_employee(requester_id, before_row.employee_id) THEN
    RAISE EXCEPTION 'Not authorized to manage this leave request.'
      USING ERRCODE = '42501';
  END IF;

  IF before_row.final_approved_at IS NULL OR before_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancellation workflow unavailable for non-final-approved leave.'
      USING ERRCODE = 'P0001';
  END IF;

  IF before_row.cancellation_status IS NULL THEN
    RAISE EXCEPTION 'Cancellation request has not been submitted.'
      USING ERRCODE = 'P0001';
  END IF;

  IF _expected_cancellation_status IS NOT NULL
     AND before_row.cancellation_status IS DISTINCT FROM _expected_cancellation_status THEN
    RAISE EXCEPTION 'STALE_CANCELLATION_STATUS: expected %, actual %.',
      _expected_cancellation_status, before_row.cancellation_status
      USING ERRCODE = 'P0001';
  END IF;

  IF before_row.cancellation_status NOT IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
    RAISE EXCEPTION 'Cancellation request is already resolved (%).', before_row.cancellation_status
      USING ERRCODE = 'P0001';
  END IF;

  cancellation_route := ARRAY(
    SELECT stage
    FROM unnest(ARRAY['manager', 'general_manager', 'director']) AS stage
    WHERE stage = ANY(COALESCE(before_row.cancellation_route_snapshot, ARRAY[]::text[]))
  );

  IF COALESCE(array_length(cancellation_route, 1), 0) = 0 THEN
    SELECT COALESCE(public.get_user_role(before_row.employee_id), 'employee'::public.app_role)
    INTO employee_role;

    cancellation_route := CASE employee_role
      WHEN 'employee'::public.app_role THEN ARRAY['manager', 'general_manager', 'director']::text[]
      WHEN 'manager'::public.app_role THEN ARRAY['general_manager', 'director']::text[]
      WHEN 'general_manager'::public.app_role THEN ARRAY['general_manager', 'director']::text[]
      ELSE ARRAY['director']::text[]
    END;
  END IF;

  current_stage := CASE before_row.cancellation_status
    WHEN 'pending' THEN NULL
    WHEN 'manager_approved' THEN 'manager'
    WHEN 'gm_approved' THEN 'general_manager'
    WHEN 'director_approved' THEN 'director'
    ELSE NULL
  END;

  next_stage := public.next_leave_stage_from_route(cancellation_route, current_stage);
  IF next_stage IS NULL THEN
    RAISE EXCEPTION 'Cancellation workflow has no actionable next stage.'
      USING ERRCODE = 'P0001';
  END IF;

  IF (next_stage = 'manager' AND requester_role <> 'manager'::public.app_role)
     OR (next_stage = 'general_manager' AND requester_role <> 'general_manager'::public.app_role)
     OR (next_stage = 'director' AND requester_role <> 'director'::public.app_role) THEN
    RAISE EXCEPTION 'STAGE_MISMATCH: current cancellation stage requires % approval.', next_stage
      USING ERRCODE = '42501';
  END IF;

  IF _action = 'reject' THEN
    UPDATE public.leave_requests
    SET
      cancellation_status = 'rejected',
      cancellation_comments = normalized_comments,
      cancellation_rejected_at = now_ts,
      cancellation_rejected_by = requester_id,
      cancellation_rejection_reason = COALESCE(normalized_reason, 'Rejected by approver'),
      updated_at = now_ts
    WHERE id = _request_id;
  ELSE
    route_len := COALESCE(array_length(cancellation_route, 1), 0);
    next_stage_index := array_position(cancellation_route, next_stage);

    IF next_stage_index IS NULL OR route_len = 0 THEN
      RAISE EXCEPTION 'Cancellation workflow route is invalid.'
        USING ERRCODE = 'P0001';
    END IF;

    is_final_stage := (next_stage_index = route_len);

    UPDATE public.leave_requests
    SET
      cancellation_status = CASE
        WHEN is_final_stage THEN 'approved'
        WHEN next_stage = 'manager' THEN 'manager_approved'
        WHEN next_stage = 'general_manager' THEN 'gm_approved'
        ELSE 'director_approved'
      END,
      cancellation_comments = normalized_comments,
      cancellation_manager_approved_at = CASE WHEN next_stage = 'manager' THEN now_ts ELSE cancellation_manager_approved_at END,
      cancellation_manager_approved_by = CASE WHEN next_stage = 'manager' THEN requester_id ELSE cancellation_manager_approved_by END,
      cancellation_gm_approved_at = CASE WHEN next_stage = 'general_manager' THEN now_ts ELSE cancellation_gm_approved_at END,
      cancellation_gm_approved_by = CASE WHEN next_stage = 'general_manager' THEN requester_id ELSE cancellation_gm_approved_by END,
      cancellation_director_approved_at = CASE WHEN next_stage = 'director' THEN now_ts ELSE cancellation_director_approved_at END,
      cancellation_director_approved_by = CASE WHEN next_stage = 'director' THEN requester_id ELSE cancellation_director_approved_by END,
      cancellation_final_approved_at = CASE WHEN is_final_stage THEN now_ts ELSE cancellation_final_approved_at END,
      cancellation_final_approved_by = CASE WHEN is_final_stage THEN requester_id ELSE cancellation_final_approved_by END,
      cancellation_final_approved_by_role = CASE WHEN is_final_stage THEN requester_role ELSE cancellation_final_approved_by_role END,
      cancellation_rejected_at = NULL,
      cancellation_rejected_by = NULL,
      cancellation_rejection_reason = NULL,
      status = CASE WHEN is_final_stage THEN 'cancelled' ELSE status END,
      cancelled_at = CASE WHEN is_final_stage THEN now_ts ELSE cancelled_at END,
      cancelled_by = CASE WHEN is_final_stage THEN requester_id ELSE cancelled_by END,
      cancelled_by_role = CASE WHEN is_final_stage THEN requester_role ELSE cancelled_by_role END,
      updated_at = now_ts
    WHERE id = _request_id;
  END IF;

  SELECT *
  INTO after_row
  FROM public.leave_requests
  WHERE id = _request_id;

  INSERT INTO public.leave_request_decisions (
    leave_request_id,
    stage,
    action,
    decided_by,
    decision_reason,
    comments,
    from_status,
    to_status,
    from_cancellation_status,
    to_cancellation_status,
    metadata
  )
  VALUES (
    _request_id,
    next_stage,
    CASE WHEN _action = 'approve' THEN 'cancel_approve' ELSE 'cancel_reject' END,
    requester_id,
    normalized_reason,
    normalized_comments,
    before_row.status,
    after_row.status,
    before_row.cancellation_status,
    after_row.cancellation_status,
    jsonb_build_object(
      'decided_via', 'leave_decide_cancellation_request_v2',
      'expected_cancellation_status', _expected_cancellation_status,
      'workflow_stage', next_stage,
      'is_final_stage', is_final_stage
    )
  );

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'status', after_row.status,
    'cancellation_status', after_row.cancellation_status,
    'action', _action,
    'workflow_stage', next_stage,
    'resolved', after_row.cancellation_status IN ('approved', 'rejected')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_decide_cancellation_request_v2(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_decide_cancellation_request_v2(uuid, text, text, text, text) TO authenticated, service_role;
