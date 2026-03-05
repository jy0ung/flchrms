-- =============================================================================
-- Migration: admin_create_employee allow admin
-- Purpose:   Expand admin_create_employee authorization gate to include admin
--            role in addition to existing HR and Director access.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.admin_create_employee(
  _email            text,
  _password         text,
  _first_name       text,
  _last_name        text DEFAULT '',
  _phone            text DEFAULT NULL,
  _job_title        text DEFAULT NULL,
  _department_id    uuid DEFAULT NULL,
  _hire_date        date DEFAULT NULL,
  _manager_id       uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id UUID;
  new_user_id  UUID;
BEGIN
  -- ── Auth gate ──────────────────────────────────────────────────────────
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  -- Admin, HR, and Director may create employees.
  IF NOT (
    public.has_role(requester_id, 'admin'::public.app_role)
    OR public.has_role(requester_id, 'hr'::public.app_role)
    OR public.has_role(requester_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges: only Admin, HR, or Director may create employees'
      USING ERRCODE = '42501';
  END IF;

  -- ── Input validation ───────────────────────────────────────────────────
  IF pg_catalog.trim(pg_catalog.coalesce(_email, '')) = '' THEN
    RAISE EXCEPTION 'Email is required'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(pg_catalog.coalesce(_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.trim(pg_catalog.coalesce(_first_name, '')) = '' THEN
    RAISE EXCEPTION 'First name is required'
      USING ERRCODE = '22023';
  END IF;

  -- Check for duplicate email
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(pg_catalog.trim(_email)) AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'An account with this email already exists'
      USING ERRCODE = '23505';
  END IF;

  -- Validate FK references if provided
  IF _department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = _department_id) THEN
    RAISE EXCEPTION 'Department not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF _manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _manager_id) THEN
    RAISE EXCEPTION 'Manager not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- ── Create auth user ──────────────────────────────────────────────────
  new_user_id := gen_random_uuid();

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
    new_user_id,
    'authenticated',
    'authenticated',
    pg_catalog.trim(_email),
    extensions.crypt(_password, extensions.gen_salt('bf')),
    pg_catalog.now(),
    NULL,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', pg_catalog.trim(_email),
      'first_name', pg_catalog.trim(_first_name),
      'last_name', pg_catalog.trim(pg_catalog.coalesce(_last_name, '')),
      'email_verified', true,
      'phone_verified', false
    ),
    pg_catalog.now(),
    pg_catalog.now(),
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

  -- The handle_new_user trigger fires here and creates:
  --   1. public.profiles row (id, email, first_name, last_name, employee_id)
  --   2. public.user_roles row (user_id, role='employee')
  -- The set_profiles_username trigger also fires on the profiles INSERT to
  -- auto-generate a unique username.

  -- ── Patch optional profile fields ──────────────────────────────────────
  -- Only update fields that were explicitly provided (non-NULL).
  UPDATE public.profiles
  SET
    phone         = COALESCE(_phone,         phone),
    job_title     = COALESCE(_job_title,     job_title),
    department_id = COALESCE(_department_id, department_id),
    hire_date     = COALESCE(_hire_date,     hire_date),
    manager_id    = COALESCE(_manager_id,    manager_id)
  WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_employee(text, text, text, text, text, text, uuid, date, uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_create_employee IS
  'Creates a new employee auth account and profile. Admin/HR/Director only. '
  'The handle_new_user trigger auto-creates the profile row and default employee role. '
  'Optional fields (phone, job_title, department, hire_date, manager) are patched after creation.';
