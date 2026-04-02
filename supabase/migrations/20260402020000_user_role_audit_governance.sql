-- Governance hardening for user role assignments:
-- 1) Append-only audit trail for role assignment changes.
-- 2) Capability-gated RPCs that require an operator reason.
-- Direct table policies remain for compatibility, but the app should use these RPCs.

CREATE TABLE IF NOT EXISTS public.user_role_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('assign', 'update', 'remove')),
  old_role public.app_role,
  new_role public.app_role,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_role public.app_role,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_role_audit_log_user_changed_at
  ON public.user_role_audit_log (user_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_role_audit_log_changed_by_changed_at
  ON public.user_role_audit_log (changed_by, changed_at DESC);

ALTER TABLE public.user_role_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_role_audit_log_select_privileged ON public.user_role_audit_log;
CREATE POLICY user_role_audit_log_select_privileged
ON public.user_role_audit_log
FOR SELECT
TO authenticated
USING (
  public.admin_has_capability(
    (select public.request_user_id()),
    'view_admin_audit_log'::public.admin_capability
  )
);

REVOKE ALL ON public.user_role_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.user_role_audit_log TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_upsert_user_role(uuid, public.app_role, text);
CREATE OR REPLACE FUNCTION public.admin_upsert_user_role(
  _user_id uuid,
  _new_role public.app_role,
  _reason text
)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.user_roles%ROWTYPE;
  v_result public.user_roles%ROWTYPE;
  v_action text;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_roles'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_roles capability is required'
      USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  requester_role := public.get_user_role(requester_id);

  SELECT *
  INTO v_existing
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.user_roles
    SET role = _new_role
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
    v_action := 'update';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, _new_role)
    RETURNING * INTO v_result;
    v_action := 'assign';
  END IF;

  INSERT INTO public.user_role_audit_log (
    user_id,
    action,
    old_role,
    new_role,
    reason,
    changed_by,
    changed_by_role
  )
  VALUES (
    _user_id,
    v_action,
    v_existing.role,
    v_result.role,
    v_reason,
    requester_id,
    requester_role
  );

  RETURN v_result;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_remove_user_role(uuid, text);
CREATE OR REPLACE FUNCTION public.admin_remove_user_role(
  _user_id uuid,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.user_roles%ROWTYPE;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_roles'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_roles capability is required'
      USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  requester_role := public.get_user_role(requester_id);

  SELECT *
  INTO v_existing
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role assignment not found'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.user_roles
  WHERE id = v_existing.id;

  INSERT INTO public.user_role_audit_log (
    user_id,
    action,
    old_role,
    new_role,
    reason,
    changed_by,
    changed_by_role
  )
  VALUES (
    _user_id,
    'remove',
    v_existing.role,
    NULL,
    v_reason,
    requester_id,
    requester_role
  );

  RETURN _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_user_role(uuid, public.app_role, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_user_role(uuid, public.app_role, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_remove_user_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_user_role(uuid, text) TO authenticated, service_role;
