BEGIN;

DROP POLICY IF EXISTS profiles_select_leave_request_participants ON public.profiles;
CREATE POLICY profiles_select_leave_request_participants
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE public.can_access_leave_request(
      public.request_user_id(),
      lr.employee_id,
      lr.status,
      lr.approval_route_snapshot
    )
    AND (
      profiles.id = lr.employee_id
      OR profiles.id = lr.manager_approved_by
      OR profiles.id = lr.gm_approved_by
      OR profiles.id = lr.director_approved_by
      OR profiles.id = lr.hr_approved_by
      OR profiles.id = lr.final_approved_by
      OR profiles.id = lr.rejected_by
      OR profiles.id = lr.cancellation_requested_by
      OR profiles.id = lr.cancellation_manager_approved_by
      OR profiles.id = lr.cancellation_gm_approved_by
      OR profiles.id = lr.cancellation_director_approved_by
      OR profiles.id = lr.cancellation_final_approved_by
      OR profiles.id = lr.cancellation_rejected_by
      OR profiles.id = lr.cancelled_by
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.leave_request_events lre
    JOIN public.leave_requests lr ON lr.id = lre.leave_request_id
    WHERE lre.actor_user_id = profiles.id
      AND public.can_access_leave_request(
        public.request_user_id(),
        lr.employee_id,
        lr.status,
        lr.approval_route_snapshot
      )
  )
);

COMMIT;
