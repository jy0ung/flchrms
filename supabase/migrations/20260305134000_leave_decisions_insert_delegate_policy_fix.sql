BEGIN;

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
        OR public.leave_get_active_approval_delegator(public.request_user_id(), 'manager'::public.app_role, now()) IS NOT NULL
        OR public.leave_get_active_approval_delegator(public.request_user_id(), 'general_manager'::public.app_role, now()) IS NOT NULL
        OR public.leave_get_active_approval_delegator(public.request_user_id(), 'director'::public.app_role, now()) IS NOT NULL
      )
  )
);

COMMIT;
