-- Migration: admin employee management flow hotfix
-- Purpose:
--   1) Align profile update trigger with capability-based admin model so admin
--      create/update/archive flows can mutate allowed profile fields when the
--      actor has manage_employee_directory capability.
--   2) Fix admin_reset_user_password runtime error caused by schema-qualifying
--      coalesce().

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_profiles_admin_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  actor_id uuid;
  old_filtered jsonb;
  new_filtered jsonb;
BEGIN
  actor_id := public.request_user_id();

  -- Allow backend/migration contexts with no request user.
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Any actor with manage_employee_directory capability can perform profile
  -- updates that pass RLS checks.
  IF public.admin_has_capability(actor_id, 'manage_employee_directory'::public.admin_capability) THEN
    RETURN NEW;
  END IF;

  -- If an admin account has manage_employee_directory disabled via override,
  -- preserve a restricted fallback: only username alias updates are allowed.
  IF public.has_role(actor_id, 'admin'::public.app_role) THEN
    old_filtered := to_jsonb(OLD) - 'username' - 'updated_at';
    new_filtered := to_jsonb(NEW) - 'username' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Insufficient privileges: manage_employee_directory capability is required for non-username profile updates.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1'
    USING _target_user_id;
  END IF;

  IF pg_catalog.to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1'
    USING _target_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_user_password(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated, service_role;

COMMIT;
