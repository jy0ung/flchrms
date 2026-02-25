-- Phase 2 RBAC hardening for profiles
-- Admin remains a system supervisor and can manage username aliases, but cannot
-- modify other profile fields directly. HR/Director retain broader profile edit access.

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

  -- HR and Director keep full profile update capability (subject to RLS row checks).
  IF public.has_role(actor_id, 'hr'::public.app_role)
     OR public.has_role(actor_id, 'director'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Admin can only change username alias. Ignore updated_at because it is changed
  -- by the standard timestamp trigger on every update.
  IF public.has_role(actor_id, 'admin'::public.app_role) THEN
    old_filtered := to_jsonb(OLD) - 'username' - 'updated_at';
    new_filtered := to_jsonb(NEW) - 'username' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Admin can only update username aliases from this endpoint.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_guard_profiles_admin_update_scope ON public.profiles;

CREATE TRIGGER zz_guard_profiles_admin_update_scope
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_profiles_admin_update_scope();
