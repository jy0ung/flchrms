BEGIN;

CREATE OR REPLACE FUNCTION public.leave_next_required_stage_for_status(
  _status text,
  _approval_route_snapshot text[]
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $$
DECLARE
  v_route text[] := COALESCE(_approval_route_snapshot, ARRAY['manager', 'general_manager', 'director']);
BEGIN
  IF _status = 'pending' THEN
    RETURN public.next_leave_stage_from_route(v_route, NULL);
  ELSIF _status = 'manager_approved' THEN
    RETURN public.next_leave_stage_from_route(v_route, 'manager');
  ELSIF _status = 'gm_approved' THEN
    RETURN public.next_leave_stage_from_route(v_route, 'general_manager');
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_next_required_stage_for_status(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_next_required_stage_for_status(text, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_leave_request(
  _actor_id uuid,
  _employee_id uuid,
  _status text,
  _approval_route_snapshot text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_stage text;
  v_required_role public.app_role;
BEGIN
  IF public.can_access_leave_employee(_actor_id, _employee_id) THEN
    RETURN true;
  END IF;

  v_stage := public.leave_next_required_stage_for_status(_status, _approval_route_snapshot);
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

REVOKE ALL ON FUNCTION public.can_access_leave_request(uuid, uuid, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_leave_request(uuid, uuid, text, text[]) TO authenticated, service_role;

DROP POLICY IF EXISTS leave_requests_select_authenticated ON public.leave_requests;
CREATE POLICY leave_requests_select_authenticated
ON public.leave_requests
FOR SELECT
TO authenticated
USING (
  public.can_access_leave_request(
    public.request_user_id(),
    employee_id,
    status,
    approval_route_snapshot
  )
);

DROP POLICY IF EXISTS leave_request_decisions_select_visibility ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_select_visibility
ON public.leave_request_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_decisions.leave_request_id
      AND public.can_access_leave_request(
        public.request_user_id(),
        lr.employee_id,
        lr.status,
        lr.approval_route_snapshot
      )
  )
);

DROP POLICY IF EXISTS leave_request_decisions_insert_visibility ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_insert_visibility
ON public.leave_request_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  leave_request_decisions.decided_by = public.request_user_id()
  AND EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_decisions.leave_request_id
      AND (
        public.can_access_leave_employee(public.request_user_id(), lr.employee_id)
        OR public.leave_get_active_approval_delegator(
          public.request_user_id(),
          public.leave_stage_required_role(
            public.leave_next_required_stage_for_status(
              leave_request_decisions.from_status,
              lr.approval_route_snapshot
            )
          ),
          now()
        ) IS NOT NULL
      )
  )
);

COMMIT;
