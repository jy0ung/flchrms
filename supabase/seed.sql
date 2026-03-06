-- Local development seed data.
-- This creates a deterministic admin account for environments where sign-up is disabled.
DO $$
DECLARE
  v_email constant text := 'admin@flchrms.test';
  v_password constant text := 'Test1234!';
  v_first_name constant text := 'System';
  v_last_name constant text := 'Admin';
  v_username constant text := 'admin.test';
  v_employee_id constant text := 'TST-ADM-001';
  v_user_id uuid;
BEGIN
  SELECT u.id
    INTO v_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(v_email)
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
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      NULL,
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_email,
        'first_name', v_first_name,
        'last_name', v_last_name,
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
      email = v_email,
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'sub', v_user_id::text,
          'email', v_email,
          'first_name', v_first_name,
          'last_name', v_last_name,
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
      'email', v_email,
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
    v_email,
    v_first_name,
    v_last_name,
    v_username,
    v_employee_id,
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
  VALUES (v_user_id, 'admin'::public.app_role);

  RAISE NOTICE 'Seeded local admin account: %', v_email;
END
$$;
