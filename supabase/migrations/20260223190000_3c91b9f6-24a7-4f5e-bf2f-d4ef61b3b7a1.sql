-- Admin/HR password reset RPC and DB-level username change guard

-- Only HR/Admin may change profile usernames (enforced at DB layer)
CREATE OR REPLACE FUNCTION public.enforce_username_admin_hr_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  requester_id UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  requester_id := auth.uid();

  -- Allow system/migration/service-role style operations where no end-user JWT is present.
  IF requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(requester_id, 'admin'::public.app_role)
     OR public.has_role(requester_id, 'hr'::public.app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only HR/Admin can change username aliases'
    USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_username_admin_hr_only() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zz_guard_profiles_username_update ON public.profiles;
CREATE TRIGGER zz_guard_profiles_username_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_username_admin_hr_only();

-- Admin/HR password reset for any user (server-side hash update + session invalidation)
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

  IF NOT (
    public.has_role(requester_id, 'admin'::public.app_role)
    OR public.has_role(requester_id, 'hr'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  IF pg_catalog.char_length(pg_catalog.coalesce(_new_password, '')) < 6 THEN
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
