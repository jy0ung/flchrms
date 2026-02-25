-- Local/dev targeted seed for role-based manual verification + Phase 3B E2E.
-- WARNING: This creates predictable test credentials. Use ONLY in local/dev environments.

BEGIN;

-- ---------------------------------------------------------------------------
-- Fixed IDs (deterministic + idempotent reruns)
-- ---------------------------------------------------------------------------
-- Users / roles
-- admin            a1111111-1111-1111-1111-111111111111
-- hr               b2222222-2222-2222-2222-222222222222
-- director         c3333333-3333-3333-3333-333333333333
-- general_manager  d4444444-4444-4444-4444-444444444444
-- manager          e5555555-5555-5555-5555-555555555555
-- employee         f6666666-6666-6666-6666-666666666666

-- ---------------------------------------------------------------------------
-- Cleanup existing seed fixtures (idempotent rerun support)
-- ---------------------------------------------------------------------------
DELETE FROM public.leave_requests
WHERE id IN (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000003',
  '70000000-0000-0000-0000-000000000004'
);

DELETE FROM public.documents
WHERE id = '71000000-0000-0000-0000-000000000001';

DELETE FROM public.performance_reviews
WHERE id = '72000000-0000-0000-0000-000000000001';

DELETE FROM public.training_enrollments
WHERE id = '73000000-0000-0000-0000-000000000001';

DELETE FROM public.training_programs
WHERE id = '73000000-0000-0000-0000-000000000010';

DELETE FROM public.attendance
WHERE id IN (
  '74000000-0000-0000-0000-000000000001',
  '74000000-0000-0000-0000-000000000002',
  '74000000-0000-0000-0000-000000000003'
);

DELETE FROM public.payslips
WHERE id = '75000000-0000-0000-0000-000000000001';

DELETE FROM public.employee_deductions
WHERE id = '75000000-0000-0000-0000-000000000002';

DELETE FROM public.salary_structures
WHERE id = '75000000-0000-0000-0000-000000000003';

DELETE FROM public.payroll_periods
WHERE id = '75000000-0000-0000-0000-000000000004';

DELETE FROM public.deduction_types
WHERE id = '75000000-0000-0000-0000-000000000005';

DELETE FROM public.announcements
WHERE id = '76000000-0000-0000-0000-000000000001';

DELETE FROM public.department_events
WHERE id = '76000000-0000-0000-0000-000000000002';

DELETE FROM public.holidays
WHERE id = '76000000-0000-0000-0000-000000000003';

DELETE FROM public.leave_types
WHERE id IN (
  '77000000-0000-0000-0000-000000000001',
  '77000000-0000-0000-0000-000000000002'
);

DELETE FROM public.leave_approval_workflows
WHERE id IN (
  '78000000-0000-0000-0000-000000000001',
  '78000000-0000-0000-0000-000000000002'
);
DELETE FROM public.leave_approval_workflows
WHERE requester_role = 'employee'
  AND (
    department_id IS NULL
    OR department_id IN (
      '60000000-0000-0000-0000-000000000001',
      '60000000-0000-0000-0000-000000000002'
    )
  );

DELETE FROM public.leave_cancellation_workflows
WHERE id IN (
  '79000000-0000-0000-0000-000000000001',
  '79000000-0000-0000-0000-000000000002'
);
DELETE FROM public.leave_cancellation_workflows
WHERE requester_role = 'employee'
  AND (
    department_id IS NULL
    OR department_id IN (
      '60000000-0000-0000-0000-000000000001',
      '60000000-0000-0000-0000-000000000002'
    )
  );

UPDATE public.departments
SET manager_id = null
WHERE manager_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666'
);

DELETE FROM auth.users
WHERE id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666'
)
OR email LIKE '%@flchrms.test';

DELETE FROM public.departments
WHERE id IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
);

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
INSERT INTO public.departments (id, name, description)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'Operations', 'Seeded department for manager/GM/employee workflow verification'),
  ('60000000-0000-0000-0000-000000000002', 'People Operations', 'Seeded HR/Admin department')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Auth users + identities (login-capable local test accounts)
-- Password for all accounts: Test1234!
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  email_change_token_current,
  email_change_confirm_status,
  reauthentication_token,
  is_sso_user,
  is_anonymous
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a1111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"a1111111-1111-1111-1111-111111111111","email":"admin@flchrms.test","first_name":"System","last_name":"Admin","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b2222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'hr@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"b2222222-2222-2222-2222-222222222222","email":"hr@flchrms.test","first_name":"Hannah","last_name":"HR","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c3333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'director@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"c3333333-3333-3333-3333-333333333333","email":"director@flchrms.test","first_name":"Diana","last_name":"Director","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'd4444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'gm@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"d4444444-4444-4444-4444-444444444444","email":"gm@flchrms.test","first_name":"Gavin","last_name":"GM","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'e5555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'manager@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"e5555555-5555-5555-5555-555555555555","email":"manager@flchrms.test","first_name":"Mason","last_name":"Manager","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'f6666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'employee@flchrms.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"f6666666-6666-6666-6666-666666666666","email":"employee@flchrms.test","first_name":"Evelyn","last_name":"Employee","email_verified":true,"phone_verified":false}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    0,
    '',
    false,
    false
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  aud = EXCLUDED.aud,
  role = EXCLUDED.role,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now(),
  deleted_at = null,
  banned_until = null,
  is_sso_user = false,
  is_anonymous = false;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  ('a1111111-1111-1111-1111-aaaaaaaaaaaa', 'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'email', '{"sub":"a1111111-1111-1111-1111-111111111111","email":"admin@flchrms.test","first_name":"System","last_name":"Admin","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now()),
  ('b2222222-2222-2222-2222-bbbbbbbbbbbb', 'b2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 'email', '{"sub":"b2222222-2222-2222-2222-222222222222","email":"hr@flchrms.test","first_name":"Hannah","last_name":"HR","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now()),
  ('c3333333-3333-3333-3333-cccccccccccc', 'c3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', 'email', '{"sub":"c3333333-3333-3333-3333-333333333333","email":"director@flchrms.test","first_name":"Diana","last_name":"Director","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now()),
  ('d4444444-4444-4444-4444-dddddddddddd', 'd4444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', 'email', '{"sub":"d4444444-4444-4444-4444-444444444444","email":"gm@flchrms.test","first_name":"Gavin","last_name":"GM","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now()),
  ('e5555555-5555-5555-5555-eeeeeeeeeeee', 'e5555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555', 'email', '{"sub":"e5555555-5555-5555-5555-555555555555","email":"manager@flchrms.test","first_name":"Mason","last_name":"Manager","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now()),
  ('f6666666-6666-6666-6666-ffffffffffff', 'f6666666-6666-6666-6666-666666666666', 'f6666666-6666-6666-6666-666666666666', 'email', '{"sub":"f6666666-6666-6666-6666-666666666666","email":"employee@flchrms.test","first_name":"Evelyn","last_name":"Employee","email_verified":true,"phone_verified":false}'::jsonb, now(), now(), now())
ON CONFLICT (provider_id, provider) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  identity_data = EXCLUDED.identity_data,
  last_sign_in_at = EXCLUDED.last_sign_in_at,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Profiles + roles (normalize after handle_new_user trigger)
-- ---------------------------------------------------------------------------
DELETE FROM public.user_roles
WHERE user_id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666'
);

INSERT INTO public.user_roles (id, user_id, role)
VALUES
  ('81000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'admin'),
  ('81000000-0000-0000-0000-000000000002', 'b2222222-2222-2222-2222-222222222222', 'hr'),
  ('81000000-0000-0000-0000-000000000003', 'c3333333-3333-3333-3333-333333333333', 'director'),
  ('81000000-0000-0000-0000-000000000004', 'd4444444-4444-4444-4444-444444444444', 'general_manager'),
  ('81000000-0000-0000-0000-000000000005', 'e5555555-5555-5555-5555-555555555555', 'manager'),
  ('81000000-0000-0000-0000-000000000006', 'f6666666-6666-6666-6666-666666666666', 'employee')
ON CONFLICT (id) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role;

INSERT INTO public.profiles (
  id, email, first_name, last_name, phone, department_id, job_title, manager_id, status, employee_id, username
)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'admin@flchrms.test', 'System', 'Admin', '+10000000001', '60000000-0000-0000-0000-000000000002', 'System Administrator', 'c3333333-3333-3333-3333-333333333333', 'active', 'TST-ADM-001', 'admin.test'),
  ('b2222222-2222-2222-2222-222222222222', 'hr@flchrms.test', 'Hannah', 'HR', '+10000000002', '60000000-0000-0000-0000-000000000002', 'HR Manager', 'c3333333-3333-3333-3333-333333333333', 'active', 'TST-HR-001', 'hr.test'),
  ('c3333333-3333-3333-3333-333333333333', 'director@flchrms.test', 'Diana', 'Director', '+10000000003', '60000000-0000-0000-0000-000000000001', 'Director', null, 'active', 'TST-DIR-001', 'director.test'),
  ('d4444444-4444-4444-4444-444444444444', 'gm@flchrms.test', 'Gavin', 'GM', '+10000000004', '60000000-0000-0000-0000-000000000001', 'General Manager', 'c3333333-3333-3333-3333-333333333333', 'active', 'TST-GM-001', 'gm.test'),
  ('e5555555-5555-5555-5555-555555555555', 'manager@flchrms.test', 'Mason', 'Manager', '+10000000005', '60000000-0000-0000-0000-000000000001', 'Operations Manager', 'd4444444-4444-4444-4444-444444444444', 'active', 'TST-MGR-001', 'manager.test'),
  ('f6666666-6666-6666-6666-666666666666', 'employee@flchrms.test', 'Evelyn', 'Employee', '+10000000006', '60000000-0000-0000-0000-000000000001', 'Operations Executive', 'e5555555-5555-5555-5555-555555555555', 'active', 'TST-EMP-001', 'employee.test')
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  department_id = EXCLUDED.department_id,
  job_title = EXCLUDED.job_title,
  manager_id = EXCLUDED.manager_id,
  status = EXCLUDED.status,
  employee_id = EXCLUDED.employee_id,
  username = EXCLUDED.username,
  updated_at = now();

UPDATE public.departments
SET manager_id = CASE id
  WHEN '60000000-0000-0000-0000-000000000001' THEN 'e5555555-5555-5555-5555-555555555555'::uuid
  WHEN '60000000-0000-0000-0000-000000000002' THEN 'b2222222-2222-2222-2222-222222222222'::uuid
  ELSE manager_id
END,
updated_at = now()
WHERE id IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
);

-- ---------------------------------------------------------------------------
-- Core config data
-- ---------------------------------------------------------------------------
INSERT INTO public.leave_types (
  id, name, description, days_allowed, is_paid, min_days, requires_document
)
VALUES
  ('77000000-0000-0000-0000-000000000001', 'Seeded Annual Leave', 'Seeded annual leave type', 18, true, 1, false),
  ('77000000-0000-0000-0000-000000000002', 'Seeded Sick Leave', 'Seeded sick leave type', 12, true, 1, true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  days_allowed = EXCLUDED.days_allowed,
  is_paid = EXCLUDED.is_paid,
  min_days = EXCLUDED.min_days,
  requires_document = EXCLUDED.requires_document;

-- Department-based workflow profiles (canonical requester_role='employee')
INSERT INTO public.leave_approval_workflows (
  id, requester_role, department_id, approval_stages, is_active, notes
)
VALUES
  ('78000000-0000-0000-0000-000000000001', 'employee', null, ARRAY['manager','general_manager','director']::text[], true, 'Seeded global default approval route'),
  ('78000000-0000-0000-0000-000000000002', 'employee', '60000000-0000-0000-0000-000000000001', ARRAY['manager','director']::text[], true, 'Seeded Operations department approval route')
ON CONFLICT (id) DO UPDATE
SET
  requester_role = EXCLUDED.requester_role,
  department_id = EXCLUDED.department_id,
  approval_stages = EXCLUDED.approval_stages,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.leave_cancellation_workflows (
  id, requester_role, department_id, approval_stages, is_active, notes
)
VALUES
  ('79000000-0000-0000-0000-000000000001', 'employee', null, ARRAY['manager','general_manager','director']::text[], true, 'Seeded global default cancellation route'),
  ('79000000-0000-0000-0000-000000000002', 'employee', '60000000-0000-0000-0000-000000000001', ARRAY['manager','director']::text[], true, 'Seeded Operations department cancellation route')
ON CONFLICT (id) DO UPDATE
SET
  requester_role = EXCLUDED.requester_role,
  department_id = EXCLUDED.department_id,
  approval_stages = EXCLUDED.approval_stages,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Ensure canonical uniqueness if IDs were changed by prior experiments.
DELETE FROM public.leave_approval_workflows a
USING public.leave_approval_workflows b
WHERE a.requester_role = b.requester_role
  AND a.department_id IS NOT DISTINCT FROM b.department_id
  AND a.id > b.id;

DELETE FROM public.leave_cancellation_workflows a
USING public.leave_cancellation_workflows b
WHERE a.requester_role = b.requester_role
  AND a.department_id IS NOT DISTINCT FROM b.department_id
  AND a.id > b.id;

-- ---------------------------------------------------------------------------
-- Leave data (manual verification + E2E cancellation/details/calendar)
-- ---------------------------------------------------------------------------
INSERT INTO public.leave_requests (
  id,
  employee_id,
  leave_type_id,
  start_date,
  end_date,
  days_count,
  reason,
  status,
  manager_approved_by,
  manager_approved_at,
  director_approved_by,
  director_approved_at,
  hr_notified_at,
  approval_route_snapshot,
  final_approved_at,
  final_approved_by,
  final_approved_by_role
)
VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    'f6666666-6666-6666-6666-666666666666',
    '77000000-0000-0000-0000-000000000001',
    CURRENT_DATE + 2,
    CURRENT_DATE + 3,
    2,
    'Seeded final-approved leave for cancellation request E2E and calendar visibility',
    'director_approved',
    'e5555555-5555-5555-5555-555555555555',
    now() - interval '3 days',
    'c3333333-3333-3333-3333-333333333333',
    now() - interval '2 days',
    now() - interval '2 days',
    ARRAY['manager','director']::text[],
    now() - interval '2 days',
    'c3333333-3333-3333-3333-333333333333',
    'director'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'f6666666-6666-6666-6666-666666666666',
    '77000000-0000-0000-0000-000000000001',
    CURRENT_DATE + 6,
    CURRENT_DATE + 7,
    2,
    'Seeded final-approved leave with pending cancellation for manager/hr details E2E',
    'director_approved',
    'e5555555-5555-5555-5555-555555555555',
    now() - interval '8 days',
    'c3333333-3333-3333-3333-333333333333',
    now() - interval '7 days',
    now() - interval '7 days',
    ARRAY['manager','director']::text[],
    now() - interval '7 days',
    'c3333333-3333-3333-3333-333333333333',
    'director'
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'f6666666-6666-6666-6666-666666666666',
    '77000000-0000-0000-0000-000000000002',
    CURRENT_DATE + 12,
    CURRENT_DATE + 12,
    1,
    'Seeded pending leave for manual approval flow testing',
    'pending',
    null,
    null,
    null,
    null,
    null,
    ARRAY['manager','director']::text[],
    null,
    null,
    null
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'e5555555-5555-5555-5555-555555555555',
    '77000000-0000-0000-0000-000000000001',
    CURRENT_DATE + 15,
    CURRENT_DATE + 16,
    2,
    'Seeded manager self-leave request for department workflow adaptation checks',
    'pending',
    null,
    null,
    null,
    null,
    null,
    ARRAY['director']::text[],
    null,
    null,
    null
  )
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  leave_type_id = EXCLUDED.leave_type_id,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  days_count = EXCLUDED.days_count,
  reason = EXCLUDED.reason,
  status = EXCLUDED.status,
  manager_approved_by = EXCLUDED.manager_approved_by,
  manager_approved_at = EXCLUDED.manager_approved_at,
  director_approved_by = EXCLUDED.director_approved_by,
  director_approved_at = EXCLUDED.director_approved_at,
  hr_notified_at = EXCLUDED.hr_notified_at,
  approval_route_snapshot = EXCLUDED.approval_route_snapshot,
  final_approved_at = EXCLUDED.final_approved_at,
  final_approved_by = EXCLUDED.final_approved_by,
  final_approved_by_role = EXCLUDED.final_approved_by_role,
  updated_at = now();

UPDATE public.leave_requests
SET
  cancellation_status = 'pending',
  cancellation_route_snapshot = ARRAY['manager','director']::text[],
  cancellation_requested_at = now() - interval '1 day',
  cancellation_requested_by = 'f6666666-6666-6666-6666-666666666666',
  cancellation_reason = 'Seeded cancellation request for manager/HR details test',
  cancellation_comments = null,
  cancellation_manager_approved_at = null,
  cancellation_manager_approved_by = null,
  cancellation_director_approved_at = null,
  cancellation_director_approved_by = null,
  cancellation_final_approved_at = null,
  cancellation_final_approved_by = null,
  cancellation_final_approved_by_role = null,
  cancellation_rejected_at = null,
  cancellation_rejected_by = null,
  cancellation_rejection_reason = null,
  cancelled_at = null,
  cancelled_by = null,
  cancelled_by_role = null
WHERE id = '70000000-0000-0000-0000-000000000002';

-- ---------------------------------------------------------------------------
-- Calendar / announcement / attendance / documents
-- ---------------------------------------------------------------------------
INSERT INTO public.holidays (id, name, date, description, is_recurring, created_by)
VALUES (
  '76000000-0000-0000-0000-000000000003',
  'Seeded Verification Holiday',
  CURRENT_DATE + 14,
  'Seeded holiday for Team Calendar verification',
  false,
  'b2222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  date = EXCLUDED.date,
  description = EXCLUDED.description,
  is_recurring = EXCLUDED.is_recurring,
  created_by = EXCLUDED.created_by,
  updated_at = now();

INSERT INTO public.department_events (
  id, department_id, title, description, event_date, end_date, event_type, created_by
)
VALUES (
  '76000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  'Seeded Ops Planning Session',
  'Seeded department event for calendar UI verification',
  CURRENT_DATE + 10,
  CURRENT_DATE + 10,
  'meeting',
  'e5555555-5555-5555-5555-555555555555'
)
ON CONFLICT (id) DO UPDATE
SET
  department_id = EXCLUDED.department_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  end_date = EXCLUDED.end_date,
  event_type = EXCLUDED.event_type,
  created_by = EXCLUDED.created_by,
  updated_at = now();

INSERT INTO public.announcements (
  id, title, content, priority, published_by, published_at, expires_at, is_active
)
VALUES (
  '76000000-0000-0000-0000-000000000001',
  'Seeded System Verification Announcement',
  'This is seeded data for local manual verification and RBAC testing.',
  'normal',
  'b2222222-2222-2222-2222-222222222222',
  now() - interval '1 day',
  now() + interval '30 days',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  priority = EXCLUDED.priority,
  published_by = EXCLUDED.published_by,
  published_at = EXCLUDED.published_at,
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active;

INSERT INTO public.attendance (
  id, employee_id, date, clock_in, clock_out, status, notes
)
VALUES
  (
    '74000000-0000-0000-0000-000000000001',
    'f6666666-6666-6666-6666-666666666666',
    CURRENT_DATE - 1,
    (CURRENT_DATE - 1)::timestamp + interval '09:05',
    (CURRENT_DATE - 1)::timestamp + interval '17:30',
    'late',
    'Seeded attendance row'
  ),
  (
    '74000000-0000-0000-0000-000000000002',
    'f6666666-6666-6666-6666-666666666666',
    CURRENT_DATE,
    null,
    null,
    'on_leave',
    'Seeded on_leave attendance row'
  ),
  (
    '74000000-0000-0000-0000-000000000003',
    'e5555555-5555-5555-5555-555555555555',
    CURRENT_DATE,
    CURRENT_DATE::timestamp + interval '08:55',
    CURRENT_DATE::timestamp + interval '17:40',
    'present',
    'Seeded manager attendance row'
  )
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  date = EXCLUDED.date,
  clock_in = EXCLUDED.clock_in,
  clock_out = EXCLUDED.clock_out,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();

INSERT INTO public.documents (
  id, employee_id, title, description, category, file_url, file_name, file_size, uploaded_by
)
VALUES (
  '71000000-0000-0000-0000-000000000001',
  'f6666666-6666-6666-6666-666666666666',
  'Seeded Employment Contract',
  'Seeded metadata row for Documents module verification (file object not created).',
  'contract',
  'employee-documents/f6666666-6666-6666-6666-666666666666/seeded-employment-contract.pdf',
  'seeded-employment-contract.pdf',
  123456,
  'b2222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  file_url = EXCLUDED.file_url,
  file_name = EXCLUDED.file_name,
  file_size = EXCLUDED.file_size,
  uploaded_by = EXCLUDED.uploaded_by,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Training / performance
-- ---------------------------------------------------------------------------
INSERT INTO public.training_programs (
  id, title, description, category, duration_hours, is_mandatory, created_by
)
VALUES (
  '73000000-0000-0000-0000-000000000010',
  'Seeded Workplace Safety',
  'Seeded training program for module verification',
  'Compliance',
  3,
  true,
  'b2222222-2222-2222-2222-222222222222'
)
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  duration_hours = EXCLUDED.duration_hours,
  is_mandatory = EXCLUDED.is_mandatory,
  created_by = EXCLUDED.created_by,
  updated_at = now();

INSERT INTO public.training_enrollments (
  id, employee_id, program_id, status, enrolled_at, completed_at, score
)
VALUES (
  '73000000-0000-0000-0000-000000000001',
  'f6666666-6666-6666-6666-666666666666',
  '73000000-0000-0000-0000-000000000010',
  'completed',
  now() - interval '20 days',
  now() - interval '15 days',
  92
)
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  program_id = EXCLUDED.program_id,
  status = EXCLUDED.status,
  enrolled_at = EXCLUDED.enrolled_at,
  completed_at = EXCLUDED.completed_at,
  score = EXCLUDED.score;

INSERT INTO public.performance_reviews (
  id, employee_id, reviewer_id, review_period, overall_rating, strengths,
  areas_for_improvement, goals, comments, status, submitted_at
)
VALUES (
  '72000000-0000-0000-0000-000000000001',
  'f6666666-6666-6666-6666-666666666666',
  'e5555555-5555-5555-5555-555555555555',
  to_char(CURRENT_DATE, 'YYYY') || ' H1',
  4,
  'Reliable execution and communication',
  'Improve reporting turnaround time',
  'Lead one process improvement initiative',
  'Seeded performance review for module verification',
  'submitted',
  now() - interval '10 days'
)
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  reviewer_id = EXCLUDED.reviewer_id,
  review_period = EXCLUDED.review_period,
  overall_rating = EXCLUDED.overall_rating,
  strengths = EXCLUDED.strengths,
  areas_for_improvement = EXCLUDED.areas_for_improvement,
  goals = EXCLUDED.goals,
  comments = EXCLUDED.comments,
  status = EXCLUDED.status,
  submitted_at = EXCLUDED.submitted_at,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Payroll sample
-- ---------------------------------------------------------------------------
INSERT INTO public.deduction_types (
  id, name, description, deduction_type, default_value, is_mandatory, is_active
)
VALUES (
  '75000000-0000-0000-0000-000000000005',
  'Seeded Tax',
  'Seeded fixed deduction for payroll verification',
  'fixed',
  150.00,
  true,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  deduction_type = EXCLUDED.deduction_type,
  default_value = EXCLUDED.default_value,
  is_mandatory = EXCLUDED.is_mandatory,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.employee_deductions (
  id, employee_id, deduction_type_id, amount, is_active
)
VALUES (
  '75000000-0000-0000-0000-000000000002',
  'f6666666-6666-6666-6666-666666666666',
  '75000000-0000-0000-0000-000000000005',
  150.00,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  deduction_type_id = EXCLUDED.deduction_type_id,
  amount = EXCLUDED.amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.salary_structures (
  id, employee_id, basic_salary, housing_allowance, transport_allowance, meal_allowance,
  other_allowances, effective_date, is_active
)
VALUES (
  '75000000-0000-0000-0000-000000000003',
  'f6666666-6666-6666-6666-666666666666',
  3000.00,
  500.00,
  200.00,
  150.00,
  100.00,
  CURRENT_DATE - 90,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  employee_id = EXCLUDED.employee_id,
  basic_salary = EXCLUDED.basic_salary,
  housing_allowance = EXCLUDED.housing_allowance,
  transport_allowance = EXCLUDED.transport_allowance,
  meal_allowance = EXCLUDED.meal_allowance,
  other_allowances = EXCLUDED.other_allowances,
  effective_date = EXCLUDED.effective_date,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.payroll_periods (
  id, name, start_date, end_date, payment_date, status, created_by, processed_at
)
VALUES (
  '75000000-0000-0000-0000-000000000004',
  to_char(date_trunc('month', CURRENT_DATE - interval '1 month'), 'Mon YYYY') || ' Payroll (Seeded)',
  date_trunc('month', CURRENT_DATE - interval '1 month')::date,
  (date_trunc('month', CURRENT_DATE)::date - 1),
  (date_trunc('month', CURRENT_DATE)::date + 4),
  'completed',
  'b2222222-2222-2222-2222-222222222222',
  now() - interval '5 days'
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  payment_date = EXCLUDED.payment_date,
  status = EXCLUDED.status,
  created_by = EXCLUDED.created_by,
  processed_at = EXCLUDED.processed_at,
  updated_at = now();

INSERT INTO public.payslips (
  id, payroll_period_id, employee_id, basic_salary, total_allowances, total_deductions,
  gross_salary, net_salary, working_days, days_worked, days_absent, days_leave,
  overtime_hours, overtime_amount, deductions_breakdown, allowances_breakdown, status, paid_at
)
VALUES (
  '75000000-0000-0000-0000-000000000001',
  '75000000-0000-0000-0000-000000000004',
  'f6666666-6666-6666-6666-666666666666',
  3000.00,
  950.00,
  150.00,
  3950.00,
  3800.00,
  22,
  21,
  0,
  1,
  2.50,
  75.00,
  '{"Seeded Tax":150}'::jsonb,
  '{"Housing":500,"Transport":200,"Meal":150,"Other":100}'::jsonb,
  'paid',
  now() - interval '4 days'
)
ON CONFLICT (id) DO UPDATE
SET
  payroll_period_id = EXCLUDED.payroll_period_id,
  employee_id = EXCLUDED.employee_id,
  basic_salary = EXCLUDED.basic_salary,
  total_allowances = EXCLUDED.total_allowances,
  total_deductions = EXCLUDED.total_deductions,
  gross_salary = EXCLUDED.gross_salary,
  net_salary = EXCLUDED.net_salary,
  working_days = EXCLUDED.working_days,
  days_worked = EXCLUDED.days_worked,
  days_absent = EXCLUDED.days_absent,
  days_leave = EXCLUDED.days_leave,
  overtime_hours = EXCLUDED.overtime_hours,
  overtime_amount = EXCLUDED.overtime_amount,
  deductions_breakdown = EXCLUDED.deductions_breakdown,
  allowances_breakdown = EXCLUDED.allowances_breakdown,
  status = EXCLUDED.status,
  paid_at = EXCLUDED.paid_at,
  updated_at = now();

COMMIT;

-- Compact verification output (useful when run manually through psql)
SELECT
  p.first_name || ' ' || p.last_name AS name,
  p.email,
  p.employee_id,
  p.username,
  ur.role
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.id IN (
  'a1111111-1111-1111-1111-111111111111',
  'b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333',
  'd4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555',
  'f6666666-6666-6666-6666-666666666666'
)
ORDER BY
  CASE ur.role
    WHEN 'admin' THEN 1
    WHEN 'hr' THEN 2
    WHEN 'director' THEN 3
    WHEN 'general_manager' THEN 4
    WHEN 'manager' THEN 5
    ELSE 6
  END;
