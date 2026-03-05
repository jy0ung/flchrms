-- =============================================================================
-- Migration: admin capability matrix
-- Purpose:
--   1) Add DB-backed admin capability overrides + audit trail
--   2) Switch admin RPC auth gates to capability checks
--   3) Switch admin-module mutating RLS policies to capability checks
-- =============================================================================

BEGIN;

-- ── Capability enum ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'admin_capability'
  ) THEN
    CREATE TYPE public.admin_capability AS ENUM (
      'access_admin_console',
      'view_admin_dashboard',
      'view_admin_quick_actions',
      'view_admin_audit_log',
      'manage_employee_directory',
      'create_employee',
      'reset_employee_passwords',
      'manage_departments',
      'manage_roles',
      'manage_leave_policies',
      'manage_announcements',
      'manage_admin_settings',
      'view_sensitive_employee_identifiers'
    );
  END IF;
END
$$;

-- ── Override + audit tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_role_capability_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  capability public.admin_capability NOT NULL,
  enabled boolean NOT NULL,
  reason text NULL,
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, capability)
);

CREATE TABLE IF NOT EXISTS public.admin_role_capability_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  capability public.admin_capability NOT NULL,
  old_enabled boolean NULL,
  new_enabled boolean NOT NULL,
  reason text NULL,
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admin_role_capability_overrides_admin_lock'
      AND conrelid = 'public.admin_role_capability_overrides'::regclass
  ) THEN
    ALTER TABLE public.admin_role_capability_overrides
      ADD CONSTRAINT admin_role_capability_overrides_admin_lock
      CHECK (
        NOT (
          role = 'admin'::public.app_role
          AND capability IN (
            'access_admin_console'::public.admin_capability,
            'manage_roles'::public.admin_capability
          )
          AND enabled = false
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_admin_role_capability_overrides_role
  ON public.admin_role_capability_overrides (role);

CREATE INDEX IF NOT EXISTS idx_admin_role_capability_overrides_capability
  ON public.admin_role_capability_overrides (capability);

CREATE INDEX IF NOT EXISTS idx_admin_role_capability_audit_changed_at
  ON public.admin_role_capability_audit (changed_at DESC);

DROP TRIGGER IF EXISTS update_admin_role_capability_overrides_updated_at ON public.admin_role_capability_overrides;
CREATE TRIGGER update_admin_role_capability_overrides_updated_at
  BEFORE UPDATE ON public.admin_role_capability_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.admin_role_capability_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_capability_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_role_capability_overrides_select_admin ON public.admin_role_capability_overrides;
CREATE POLICY admin_role_capability_overrides_select_admin
ON public.admin_role_capability_overrides
FOR SELECT
TO authenticated
USING (public.has_role(public.request_user_id(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_role_capability_overrides_modify_admin ON public.admin_role_capability_overrides;
CREATE POLICY admin_role_capability_overrides_modify_admin
ON public.admin_role_capability_overrides
FOR ALL
TO authenticated
USING (public.has_role(public.request_user_id(), 'admin'::public.app_role))
WITH CHECK (public.has_role(public.request_user_id(), 'admin'::public.app_role));

DROP POLICY IF EXISTS admin_role_capability_audit_select_admin ON public.admin_role_capability_audit;
CREATE POLICY admin_role_capability_audit_select_admin
ON public.admin_role_capability_audit
FOR SELECT
TO authenticated
USING (public.has_role(public.request_user_id(), 'admin'::public.app_role));

-- ── Capability helpers ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_default_capability(
  _role public.app_role,
  _capability public.admin_capability
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE _role
    WHEN 'admin'::public.app_role THEN true
    WHEN 'hr'::public.app_role THEN _capability <> 'manage_roles'::public.admin_capability
    WHEN 'director'::public.app_role THEN _capability NOT IN (
      'reset_employee_passwords'::public.admin_capability,
      'manage_admin_settings'::public.admin_capability
    )
    WHEN 'general_manager'::public.app_role THEN _capability IN (
      'access_admin_console'::public.admin_capability,
      'view_admin_dashboard'::public.admin_capability,
      'view_admin_quick_actions'::public.admin_capability,
      'manage_employee_directory'::public.admin_capability,
      'create_employee'::public.admin_capability,
      'view_sensitive_employee_identifiers'::public.admin_capability
    )
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION public.admin_default_capability(public.app_role, public.admin_capability)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_default_capability(public.app_role, public.admin_capability)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_effective_role_capability(
  _role public.app_role,
  _capability public.admin_capability
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (
      SELECT o.enabled
      FROM public.admin_role_capability_overrides o
      WHERE o.role = _role
        AND o.capability = _capability
    ),
    public.admin_default_capability(_role, _capability)
  );
$$;

REVOKE ALL ON FUNCTION public.admin_effective_role_capability(public.app_role, public.admin_capability)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_effective_role_capability(public.app_role, public.admin_capability)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_has_capability(
  _user_id uuid,
  _capability public.admin_capability
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    ELSE public.admin_effective_role_capability(
      COALESCE(
        (
          SELECT ur.role
          FROM public.user_roles ur
          WHERE ur.user_id = _user_id
          LIMIT 1
        ),
        'employee'::public.app_role
      ),
      _capability
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.admin_has_capability(uuid, public.admin_capability)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_has_capability(uuid, public.admin_capability)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_my_capabilities()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  requester_id uuid;
  capability_json jsonb;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  SELECT COALESCE(
    jsonb_object_agg(capability_value::text, public.admin_has_capability(requester_id, capability_value)),
    '{}'::jsonb
  )
  INTO capability_json
  FROM unnest(enum_range(NULL::public.admin_capability)) AS capability_value;

  RETURN capability_json;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_my_capabilities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_my_capabilities() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_get_capability_matrix()
RETURNS TABLE (
  role public.app_role,
  capability public.admin_capability,
  enabled boolean,
  default_enabled boolean,
  overridden boolean,
  updated_at timestamptz,
  updated_by uuid,
  reason text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  requester_id uuid;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_role(requester_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.role_value,
    c.capability_value,
    COALESCE(
      o.enabled,
      public.admin_default_capability(r.role_value, c.capability_value)
    ) AS enabled_value,
    public.admin_default_capability(r.role_value, c.capability_value) AS default_enabled_value,
    o.id IS NOT NULL AS overridden_value,
    o.updated_at,
    o.updated_by,
    o.reason
  FROM unnest(enum_range(NULL::public.app_role)) WITH ORDINALITY AS r(role_value, role_order)
  CROSS JOIN unnest(enum_range(NULL::public.admin_capability)) WITH ORDINALITY AS c(capability_value, capability_order)
  LEFT JOIN public.admin_role_capability_overrides o
    ON o.role = r.role_value
   AND o.capability = c.capability_value
  ORDER BY r.role_order, c.capability_order;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_capability_matrix() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_capability_matrix() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_role_capability(
  _role public.app_role,
  _capability public.admin_capability,
  _enabled boolean,
  _reason text DEFAULT NULL
)
RETURNS TABLE (
  role public.app_role,
  capability public.admin_capability,
  enabled boolean,
  overridden boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  requester_id uuid;
  old_enabled boolean;
  default_enabled boolean;
  new_enabled boolean;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.has_role(requester_id, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  IF _enabled IS NULL THEN
    RAISE EXCEPTION 'Enabled flag is required'
      USING ERRCODE = '22004';
  END IF;

  IF _role = 'admin'::public.app_role
     AND _capability IN (
       'access_admin_console'::public.admin_capability,
       'manage_roles'::public.admin_capability
     )
     AND _enabled = false THEN
    RAISE EXCEPTION 'Cannot disable locked admin safeguards'
      USING ERRCODE = '22023';
  END IF;

  old_enabled := public.admin_effective_role_capability(_role, _capability);
  default_enabled := public.admin_default_capability(_role, _capability);

  IF _enabled = default_enabled THEN
    DELETE FROM public.admin_role_capability_overrides
    WHERE role = _role
      AND capability = _capability;
  ELSE
    INSERT INTO public.admin_role_capability_overrides (
      role,
      capability,
      enabled,
      reason,
      updated_by
    )
    VALUES (
      _role,
      _capability,
      _enabled,
      NULLIF(pg_catalog.btrim(_reason), ''),
      requester_id
    )
    ON CONFLICT (role, capability)
    DO UPDATE
    SET enabled = EXCLUDED.enabled,
        reason = EXCLUDED.reason,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();
  END IF;

  new_enabled := public.admin_effective_role_capability(_role, _capability);

  INSERT INTO public.admin_role_capability_audit (
    role,
    capability,
    old_enabled,
    new_enabled,
    reason,
    changed_by
  )
  VALUES (
    _role,
    _capability,
    old_enabled,
    new_enabled,
    NULLIF(pg_catalog.btrim(_reason), ''),
    requester_id
  );

  RETURN QUERY
  SELECT
    _role,
    _capability,
    new_enabled,
    EXISTS (
      SELECT 1
      FROM public.admin_role_capability_overrides o
      WHERE o.role = _role
        AND o.capability = _capability
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_role_capability(public.app_role, public.admin_capability, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_role_capability(public.app_role, public.admin_capability, boolean, text)
  TO authenticated, service_role;

-- ── Capability-gated admin RPCs ──────────────────────────────────────────────
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
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'create_employee'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: create_employee capability is required'
      USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.btrim(coalesce(_email, '')) = '' THEN
    RAISE EXCEPTION 'Email is required'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(coalesce(_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.btrim(coalesce(_first_name, '')) = '' THEN
    RAISE EXCEPTION 'First name is required'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(pg_catalog.btrim(_email)) AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'An account with this email already exists'
      USING ERRCODE = '23505';
  END IF;

  IF _department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = _department_id) THEN
    RAISE EXCEPTION 'Department not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF _manager_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _manager_id) THEN
    RAISE EXCEPTION 'Manager not found'
      USING ERRCODE = 'P0002';
  END IF;

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
    pg_catalog.btrim(_email),
    extensions.crypt(_password, extensions.gen_salt('bf')),
    pg_catalog.now(),
    NULL,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', pg_catalog.btrim(_email),
      'first_name', pg_catalog.btrim(_first_name),
      'last_name', pg_catalog.btrim(coalesce(_last_name, '')),
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

GRANT EXECUTE ON FUNCTION public.admin_create_employee(text, text, text, text, text, text, uuid, date, uuid)
  TO authenticated;

COMMENT ON FUNCTION public.admin_create_employee IS
  'Creates a new employee account/profile. Capability-gated by create_employee. '
  'The handle_new_user trigger creates profile + default employee role, then optional fields are patched.';

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

-- ── Capability-based policy updates ─────────────────────────────────────────
ALTER POLICY user_roles_insert_admin_director ON public.user_roles
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_roles'::public.admin_capability)
  );

ALTER POLICY user_roles_update_admin_director ON public.user_roles
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_roles'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_roles'::public.admin_capability)
  );

ALTER POLICY user_roles_delete_admin_director ON public.user_roles
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_roles'::public.admin_capability)
  );

ALTER POLICY departments_insert_hr_director ON public.departments
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_departments'::public.admin_capability)
  );

ALTER POLICY departments_update_hr_director ON public.departments
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_departments'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_departments'::public.admin_capability)
  );

ALTER POLICY departments_delete_hr_director ON public.departments
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_departments'::public.admin_capability)
  );

ALTER POLICY leave_types_insert_hr_director ON public.leave_types
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_types_update_hr_director ON public.leave_types
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_types_delete_hr_director ON public.leave_types
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_approval_workflows_insert_privileged ON public.leave_approval_workflows
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_approval_workflows_update_privileged ON public.leave_approval_workflows
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_approval_workflows_delete_privileged ON public.leave_approval_workflows
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_cancellation_workflows_insert_privileged ON public.leave_cancellation_workflows
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_cancellation_workflows_update_privileged ON public.leave_cancellation_workflows
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY leave_cancellation_workflows_delete_privileged ON public.leave_cancellation_workflows
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_leave_policies'::public.admin_capability)
  );

ALTER POLICY announcements_insert_hr_director ON public.announcements
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_announcements'::public.admin_capability)
  );

ALTER POLICY announcements_update_hr_director ON public.announcements
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_announcements'::public.admin_capability)
  )
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_announcements'::public.admin_capability)
  );

ALTER POLICY announcements_delete_hr_director ON public.announcements
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_announcements'::public.admin_capability)
  );

ALTER POLICY tenant_branding_update_admin_hr ON public.tenant_branding
  USING (
    public.admin_has_capability(public.request_user_id(), 'manage_admin_settings'::public.admin_capability)
  );

ALTER POLICY tenant_branding_insert_admin_hr ON public.tenant_branding
  WITH CHECK (
    public.admin_has_capability(public.request_user_id(), 'manage_admin_settings'::public.admin_capability)
  );

ALTER POLICY branding_assets_insert_admin_hr ON storage.objects
  WITH CHECK (
    bucket_id = 'branding-assets'
    AND public.admin_has_capability(auth.uid(), 'manage_admin_settings'::public.admin_capability)
  );

ALTER POLICY branding_assets_delete_admin_hr ON storage.objects
  USING (
    bucket_id = 'branding-assets'
    AND public.admin_has_capability(auth.uid(), 'manage_admin_settings'::public.admin_capability)
  );

ALTER POLICY branding_assets_update_admin_hr ON storage.objects
  USING (
    bucket_id = 'branding-assets'
    AND public.admin_has_capability(auth.uid(), 'manage_admin_settings'::public.admin_capability)
  );

ALTER POLICY profiles_update_self_hr_admin_director ON public.profiles
  USING (
    id = request_user_id()
    OR public.admin_has_capability(public.request_user_id(), 'manage_employee_directory'::public.admin_capability)
  )
  WITH CHECK (
    id = request_user_id()
    OR public.admin_has_capability(public.request_user_id(), 'manage_employee_directory'::public.admin_capability)
  );

COMMIT;
