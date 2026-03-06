BEGIN;

-- Allow managers to update direct reports, but only for the narrow
-- contact/employment fields used by the employee module limited-edit flow.
DROP POLICY IF EXISTS profiles_update_manager_direct_reports_limited ON public.profiles;

CREATE POLICY profiles_update_manager_direct_reports_limited
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'manager'::public.app_role)
  AND public.is_manager_of(public.request_user_id(), id)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'manager'::public.app_role)
  AND public.is_manager_of(public.request_user_id(), id)
);

CREATE OR REPLACE FUNCTION public.enforce_profiles_admin_update_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
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

  -- Managers can only update phone and job title for their direct reports.
  -- Ignore updated_at because it is changed by the standard timestamp trigger.
  IF public.has_role(actor_id, 'manager'::public.app_role)
     AND public.is_manager_of(actor_id, OLD.id)
  THEN
    old_filtered := to_jsonb(OLD) - 'phone' - 'job_title' - 'updated_at';
    new_filtered := to_jsonb(NEW) - 'phone' - 'job_title' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Managers can only update phone and job title for direct reports.'
        USING ERRCODE = '42501';
    END IF;

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

COMMIT;
