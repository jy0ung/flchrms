-- Director-final leave approvals, HR/Admin view-only leave access,
-- and payroll/role RBAC realignment (admin restricted from payroll; director elevated).

CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director') THEN
      RAISE EXCEPTION 'Invalid approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  IF NEW.approval_stages[stage_count] <> 'director' THEN
    RAISE EXCEPTION 'approval_stages must end with director'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

-- Normalize existing workflow rows away from legacy hr final stage while preserving order and custom skips.
UPDATE public.leave_approval_workflows w
SET approval_stages = normalized.stages,
    updated_at = now()
FROM (
  SELECT
    lw.id,
    CASE
      WHEN array_length(filtered.stages, 1) IS NULL THEN ARRAY['director']::TEXT[]
      WHEN filtered.stages[array_length(filtered.stages, 1)] = 'director' THEN filtered.stages
      ELSE array_append(array_remove(filtered.stages, 'director'), 'director')
    END AS stages
  FROM public.leave_approval_workflows lw
  CROSS JOIN LATERAL (
    SELECT ARRAY(
      SELECT stage
      FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
      WHERE stage = ANY(coalesce(lw.approval_stages, ARRAY[]::TEXT[]))
    ) AS stages
  ) AS filtered
) AS normalized
WHERE normalized.id = w.id
  AND w.approval_stages IS DISTINCT FROM normalized.stages;

-- Reset seeded defaults to the new director-final policy (preserve custom notes when present).
INSERT INTO public.leave_approval_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'director']::TEXT[], true, 'Default employee route'),
  ('manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default manager route'),
  ('general_manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default GM route'),
  ('director', ARRAY['director']::TEXT[], true, 'Default director route'),
  ('hr', ARRAY['director']::TEXT[], true, 'Default HR route'),
  ('admin', ARRAY['director']::TEXT[], true, 'Default admin route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_approval_workflows.notes, EXCLUDED.notes);

-- Rebuild leave approval workflow RLS so Director also has unrestricted configuration access.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_approval_workflows'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leave_approval_workflows', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY leave_approval_workflows_select_authenticated
ON public.leave_approval_workflows
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY leave_approval_workflows_insert_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY leave_approval_workflows_update_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY leave_approval_workflows_delete_privileged
ON public.leave_approval_workflows
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- Rebuild leave_requests policies so HR/Admin are view-only (they can still create/update their own requests via employee rules).
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leave_requests'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leave_requests', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY leave_requests_select_authenticated
ON public.leave_requests
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
);

CREATE POLICY leave_requests_insert_self
ON public.leave_requests
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = public.request_user_id()
);

CREATE POLICY leave_requests_update_workflow_and_self
ON public.leave_requests
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (employee_id = public.request_user_id() AND status = 'pending')
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'director'::public.app_role)
  OR (
    public.has_role(public.request_user_id(), 'manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR (
    public.has_role(public.request_user_id(), 'general_manager'::public.app_role)
    AND (
      public.is_manager_of(public.request_user_id(), employee_id)
      OR public.is_department_manager(public.request_user_id(), employee_id)
    )
  )
  OR employee_id = public.request_user_id()
);

-- Rebuild user_roles policies so Admin + Director can perform CRUD, while HR/Admin/Director can read all.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_roles', p.policyname);
  END LOOP;
END
$$;

CREATE POLICY user_roles_select_authenticated
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_insert_admin_director
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_update_admin_director
ON public.user_roles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY user_roles_delete_admin_director
ON public.user_roles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- Payroll tables: admin loses payroll/salary visibility and management; HR + Director retain payroll access.
DO $$
DECLARE
  t TEXT;
  p RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY['salary_structures', 'deduction_types', 'employee_deductions', 'payroll_periods', 'payslips'] LOOP
    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END
$$;

-- salary_structures
CREATE POLICY salary_structures_select_policy
ON public.salary_structures
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_insert_policy
ON public.salary_structures
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_update_policy
ON public.salary_structures
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY salary_structures_delete_policy
ON public.salary_structures
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- deduction_types
CREATE POLICY deduction_types_select_policy
ON public.deduction_types
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY deduction_types_insert_policy
ON public.deduction_types
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY deduction_types_update_policy
ON public.deduction_types
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY deduction_types_delete_policy
ON public.deduction_types
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- employee_deductions
CREATE POLICY employee_deductions_select_policy
ON public.employee_deductions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_insert_policy
ON public.employee_deductions
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_update_policy
ON public.employee_deductions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY employee_deductions_delete_policy
ON public.employee_deductions
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- payroll_periods
CREATE POLICY payroll_periods_select_policy
ON public.payroll_periods
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY payroll_periods_insert_policy
ON public.payroll_periods
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payroll_periods_update_policy
ON public.payroll_periods
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payroll_periods_delete_policy
ON public.payroll_periods
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

-- payslips
CREATE POLICY payslips_select_policy
ON public.payslips
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  employee_id = public.request_user_id()
  OR public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_insert_policy
ON public.payslips
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_update_policy
ON public.payslips
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

CREATE POLICY payslips_delete_policy
ON public.payslips
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);
