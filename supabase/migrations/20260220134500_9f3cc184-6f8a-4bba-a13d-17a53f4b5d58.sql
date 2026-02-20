-- Performance optimization migration
-- 1) Add indexes for all unindexed foreign keys in public schema
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON public.departments (manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager_id ON public.profiles (manager_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_director_approved_by ON public.leave_requests (director_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_gm_approved_by ON public.leave_requests (gm_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_hr_approved_by ON public.leave_requests (hr_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type_id ON public.leave_requests (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_manager_approved_by ON public.leave_requests (manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_rejected_by ON public.leave_requests (rejected_by);

CREATE INDEX IF NOT EXISTS idx_training_programs_created_by ON public.training_programs (created_by);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_program_id ON public.training_enrollments (program_id);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee_id ON public.performance_reviews (employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer_id ON public.performance_reviews (reviewer_id);

CREATE INDEX IF NOT EXISTS idx_announcements_published_by ON public.announcements (published_by);
CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_holidays_created_by ON public.holidays (created_by);

CREATE INDEX IF NOT EXISTS idx_department_events_created_by ON public.department_events (created_by);
CREATE INDEX IF NOT EXISTS idx_department_events_department_id ON public.department_events (department_id);

CREATE INDEX IF NOT EXISTS idx_employee_deductions_deduction_type_id ON public.employee_deductions (deduction_type_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_created_by ON public.payroll_periods (created_by);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips (employee_id);

-- 2) Stabilize user-id lookup used by RLS predicates
CREATE OR REPLACE FUNCTION public.request_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;
REVOKE ALL ON FUNCTION public.request_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_user_id() TO anon, authenticated, service_role;

-- 3) Rewrite existing public policies to use initplan-friendly uid expression
DO $$
DECLARE
  p RECORD;
  roles_sql TEXT;
  using_sql TEXT;
  check_sql TEXT;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, permissive, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (qual IS NOT NULL AND qual LIKE '%auth.uid()%')
        OR (with_check IS NOT NULL AND with_check LIKE '%auth.uid()%')
      )
    ORDER BY tablename, policyname
  LOOP
    roles_sql := array_to_string(
      ARRAY(
        SELECT CASE
          WHEN r = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r)
        END
        FROM unnest(p.roles) AS r
      ),
      ', '
    );

    using_sql := CASE
      WHEN p.qual IS NULL OR btrim(p.qual) = '' THEN ''
      ELSE format(' USING (%s)', replace(p.qual, 'auth.uid()', '(select public.request_user_id())'))
    END;

    check_sql := CASE
      WHEN p.with_check IS NULL OR btrim(p.with_check) = '' THEN ''
      ELSE format(' WITH CHECK (%s)', replace(p.with_check, 'auth.uid()', '(select public.request_user_id())'))
    END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);

    EXECUTE format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s',
      p.policyname,
      p.schemaname,
      p.tablename,
      lower(p.permissive),
      p.cmd,
      roles_sql,
      using_sql,
      check_sql
    );
  END LOOP;
END;
$$;
