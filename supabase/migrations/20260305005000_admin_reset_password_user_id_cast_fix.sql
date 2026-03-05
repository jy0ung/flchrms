-- Migration: admin reset password user_id cast compatibility fix
-- Purpose: ensure auth token/session cleanup works across Supabase auth schema
-- versions where user_id columns may be uuid or text/varchar.

BEGIN;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(_target_user_id UUID, _new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, extensions
AS $$
DECLARE
  requester_id UUID;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'reset_employee_passwords'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  IF pg_catalog.char_length(coalesce(_new_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters'
      USING ERRCODE = '22023';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = pg_catalog.now(),
      recovery_token = '',
      recovery_sent_at = NULL,
      reauthentication_token = '',
      reauthentication_sent_at = NULL
  WHERE id = _target_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF pg_catalog.to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id::text = $1'
    USING _target_user_id::text;
  END IF;

  IF pg_catalog.to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id::text = $1'
    USING _target_user_id::text;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

COMMIT;
