-- Policy shift: system admin can manage app configuration (non-sensitive tables)
-- while payroll/salary and sensitive employee identifiers remain restricted.

ALTER POLICY departments_insert_hr_director ON public.departments
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY departments_update_hr_director ON public.departments
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY departments_delete_hr_director ON public.departments
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_insert_hr_director ON public.leave_types
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_update_hr_director ON public.leave_types
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY leave_types_delete_hr_director ON public.leave_types
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_insert_hr_director ON public.holidays
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_update_hr_director ON public.holidays
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY holidays_delete_hr_director ON public.holidays
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY department_events_select_authenticated ON public.department_events
  USING (
    (department_id IN (
      SELECT profiles.department_id
      FROM profiles
      WHERE profiles.id = request_user_id()
    ))
    OR department_id IS NULL
    OR has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_insert_privileged ON public.department_events
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_update_privileged ON public.department_events
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY department_events_delete_privileged ON public.department_events
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
    OR (
      (has_role(request_user_id(), 'manager'::app_role) OR has_role(request_user_id(), 'general_manager'::app_role))
      AND is_department_manager(request_user_id(), request_user_id())
    )
  );

ALTER POLICY announcements_insert_hr_director ON public.announcements
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY announcements_update_hr_director ON public.announcements
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );

ALTER POLICY announcements_delete_hr_director ON public.announcements
  USING (
    has_role(request_user_id(), 'hr'::app_role)
    OR has_role(request_user_id(), 'director'::app_role)
    OR has_role(request_user_id(), 'admin'::app_role)
  );
