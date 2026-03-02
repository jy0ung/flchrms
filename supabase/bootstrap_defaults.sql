-- HRMS Bootstrap Defaults
-- Idempotent default rows for a freshly migrated database.
--
-- Scope:
-- - public.leave_types
-- - public.departments
-- - public.deduction_types
-- - public.leave_approval_workflows (global fallback route)
-- - public.leave_cancellation_workflows (global fallback route)
-- - storage.buckets (app buckets only)
--
-- Notes:
-- - This file is intentionally data/defaults only.
-- - It avoids overwriting user customizations where practical.
-- - Apply after migrations (and after Supabase base schemas/extensions exist).

BEGIN;

-- Default leave types
INSERT INTO public.leave_types (name, description, days_allowed, is_paid)
VALUES
  ('Annual Leave', 'Paid vacation time', 14, true),
  ('Sick Leave', 'Medical leave with documentation', 10, true),
  ('Personal Leave', 'Personal time off', 3, true),
  ('Unpaid Leave', 'Leave without pay', 30, false),
  ('Maternity Leave', 'Maternity leave for new mothers', 90, true),
  ('Paternity Leave', 'Paternity leave for new fathers', 14, true)
ON CONFLICT (name) DO NOTHING;

-- Default departments
INSERT INTO public.departments (name, description)
VALUES
  ('Engineering', 'Software development and technical operations'),
  ('Human Resources', 'HR and people operations'),
  ('Finance', 'Financial operations and accounting'),
  ('Marketing', 'Marketing and communications'),
  ('Operations', 'Business operations and logistics')
ON CONFLICT (name) DO NOTHING;

-- Default payroll deduction types
INSERT INTO public.deduction_types (name, description, deduction_type, default_value, is_mandatory)
SELECT
  seed.name,
  seed.description,
  seed.deduction_type::public.deduction_type,
  seed.default_value,
  seed.is_mandatory
FROM (
  VALUES
    ('EPF Employee', 'Employee Provident Fund contribution', 'percentage', 11::numeric, true),
    ('EPF Employer', 'Employer Provident Fund contribution', 'percentage', 12::numeric, true),
    ('SOCSO Employee', 'Social Security contribution', 'percentage', 0.5::numeric, true),
    ('Income Tax', 'Monthly tax deduction', 'percentage', 0::numeric, false),
    ('Health Insurance', 'Company health insurance', 'fixed', 0::numeric, false)
) AS seed(name, description, deduction_type, default_value, is_mandatory)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.deduction_types d
  WHERE d.name = seed.name
);

-- Required storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('employee-documents', 'employee-documents', false),
  ('leave-documents', 'leave-documents', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public
WHERE storage.buckets.name IS DISTINCT FROM EXCLUDED.name
   OR storage.buckets.public IS DISTINCT FROM EXCLUDED.public;

-- Global fallback approval workflow (department-specific overrides are managed in-app)
INSERT INTO public.leave_approval_workflows (
  requester_role,
  department_id,
  approval_stages,
  is_active,
  notes
)
VALUES (
  'employee',
  NULL,
  ARRAY['manager', 'general_manager', 'director']::text[],
  true,
  'Default global department approval route'
)
ON CONFLICT (requester_role) WHERE (department_id IS NULL) DO NOTHING;

-- Global fallback cancellation workflow (department-specific overrides are managed in-app)
INSERT INTO public.leave_cancellation_workflows (
  requester_role,
  department_id,
  approval_stages,
  is_active,
  notes
)
VALUES (
  'employee',
  NULL,
  ARRAY['manager', 'general_manager', 'director']::text[],
  true,
  'Default global department cancellation route'
)
ON CONFLICT (requester_role) WHERE (department_id IS NULL) DO NOTHING;

COMMIT;
