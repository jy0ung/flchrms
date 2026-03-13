-- Local development seed data.
-- This creates deterministic RBAC accounts for environments where sign-up is disabled.
DO $$
DECLARE
  rec record;
  v_user_id uuid;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('admin', 'admin@flchrms.test', 'Test1234!', 'System', 'Admin', 'admin.test', 'TST-ADM-001'),
        ('hr', 'hr@flchrms.test', 'Test1234!', 'Human', 'Resources', 'hr.test', 'TST-HR-001'),
        ('director', 'director@flchrms.test', 'Test1234!', 'Dana', 'Director', 'director.test', 'TST-DIR-001'),
        ('general_manager', 'gm@flchrms.test', 'Test1234!', 'Gina', 'Manager', 'gm.test', 'TST-GM-001'),
        ('manager', 'manager@flchrms.test', 'Test1234!', 'Mason', 'Manager', 'manager.test', 'TST-MGR-001'),
        ('employee', 'employee@flchrms.test', 'Test1234!', 'Evan', 'Employee', 'employee.test', 'TST-EMP-001')
    ) AS seed(role, email, password, first_name, last_name, username, employee_id)
  LOOP
    SELECT u.id
      INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(rec.email)
      AND u.deleted_at IS NULL
    ORDER BY u.created_at ASC
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

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
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        rec.email,
        extensions.crypt(rec.password, extensions.gen_salt('bf')),
        now(),
        NULL,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', rec.email,
          'first_name', rec.first_name,
          'last_name', rec.last_name,
          'email_verified', true,
          'phone_verified', false
        ),
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
      );
    ELSE
      UPDATE auth.users
      SET
        email = rec.email,
        encrypted_password = extensions.crypt(rec.password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'sub', v_user_id::text,
            'email', rec.email,
            'first_name', rec.first_name,
            'last_name', rec.last_name,
            'email_verified', true,
            'phone_verified', false
          ),
        updated_at = now()
      WHERE id = v_user_id;
    END IF;

    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', rec.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      NULL,
      now(),
      now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE
    SET
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now();

    INSERT INTO public.profiles (
      id,
      email,
      first_name,
      last_name,
      username,
      employee_id,
      status
    ) VALUES (
      v_user_id,
      rec.email,
      rec.first_name,
      rec.last_name,
      rec.username,
      rec.employee_id,
      'active'
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = excluded.email,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username,
      employee_id = excluded.employee_id,
      status = 'active',
      updated_at = now();

    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, rec.role::public.app_role);

    RAISE NOTICE 'Seeded local % account: %', rec.role, rec.email;
  END LOOP;
END
$$;

DO $$
DECLARE
  v_admin_id uuid;
  v_employee_id uuid;
  v_annual_leave_id uuid;
BEGIN
  UPDATE public.profiles
  SET
    hire_date = CASE lower(email)
      WHEN 'admin@flchrms.test' THEN DATE '2024-01-15'
      WHEN 'hr@flchrms.test' THEN DATE '2024-02-01'
      WHEN 'director@flchrms.test' THEN DATE '2023-11-01'
      WHEN 'gm@flchrms.test' THEN DATE '2024-01-08'
      WHEN 'manager@flchrms.test' THEN DATE '2024-03-04'
      WHEN 'employee@flchrms.test' THEN DATE '2025-01-06'
      ELSE hire_date
    END,
    job_title = CASE lower(email)
      WHEN 'admin@flchrms.test' THEN 'System Administrator'
      WHEN 'hr@flchrms.test' THEN 'HR Business Partner'
      WHEN 'director@flchrms.test' THEN 'Operations Director'
      WHEN 'gm@flchrms.test' THEN 'General Manager'
      WHEN 'manager@flchrms.test' THEN 'Operations Manager'
      WHEN 'employee@flchrms.test' THEN 'Operations Analyst'
      ELSE job_title
    END,
    updated_at = now()
  WHERE lower(email) IN (
    'admin@flchrms.test',
    'hr@flchrms.test',
    'director@flchrms.test',
    'gm@flchrms.test',
    'manager@flchrms.test',
    'employee@flchrms.test'
  );

  SELECT id
  INTO v_admin_id
  FROM public.profiles
  WHERE lower(email) = 'admin@flchrms.test'
  LIMIT 1;

  SELECT id
  INTO v_employee_id
  FROM public.profiles
  WHERE lower(email) = 'employee@flchrms.test'
  LIMIT 1;

  SELECT id
  INTO v_annual_leave_id
  FROM public.leave_types
  WHERE name = 'Annual Leave'
  LIMIT 1;

  IF v_admin_id IS NOT NULL AND v_employee_id IS NOT NULL AND v_annual_leave_id IS NOT NULL THEN
    INSERT INTO public.leave_balance_adjustments (
      id,
      employee_id,
      leave_type_id,
      adjustment_days,
      effective_date,
      reason,
      created_by,
      metadata
    ) VALUES (
      '11111111-1111-4111-8111-111111111111',
      v_employee_id,
      v_annual_leave_id,
      5,
      DATE '2026-01-01',
      'Local seed: ensure employee leave request preview remains testable.',
      v_admin_id,
      jsonb_build_object('seed', 'local-dev', 'fixture', 'employee-annual-balance')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END
$$;
