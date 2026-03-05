BEGIN;

CREATE OR REPLACE FUNCTION public.can_insert_leave_request_decision(
  _actor_id uuid,
  _leave_request_id uuid,
  _from_status text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_employee_id uuid;
  v_route text[];
  v_stage text;
  v_required_role public.app_role;
BEGIN
  SELECT lr.employee_id, lr.approval_route_snapshot
  INTO v_employee_id, v_route
  FROM public.leave_requests lr
  WHERE lr.id = _leave_request_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF public.can_access_leave_employee(_actor_id, v_employee_id) THEN
    RETURN true;
  END IF;

  v_stage := public.leave_next_required_stage_for_status(_from_status, v_route);
  IF v_stage IS NULL THEN
    RETURN false;
  END IF;

  v_required_role := public.leave_stage_required_role(v_stage);
  IF v_required_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN public.leave_get_active_approval_delegator(_actor_id, v_required_role, now()) IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.can_insert_leave_request_decision(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_insert_leave_request_decision(uuid, uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS leave_request_decisions_insert_visibility ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_insert_visibility
ON public.leave_request_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  leave_request_decisions.decided_by = public.request_user_id()
  AND public.can_insert_leave_request_decision(
    public.request_user_id(),
    leave_request_decisions.leave_request_id,
    leave_request_decisions.from_status
  )
);

COMMIT;
