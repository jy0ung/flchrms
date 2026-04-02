-- Tenant-governed platform settings:
-- 1) Centralize the remaining admin "settings" into a singleton tenant row.
-- 2) Require a governance reason for every tenant settings change.
-- 3) Persist an append-only audit log for later review.

BEGIN;

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  date_format text NOT NULL DEFAULT 'DD/MM/YYYY',
  email_notifications_enabled boolean NOT NULL DEFAULT true,
  session_timeout_minutes integer NOT NULL DEFAULT 30 CHECK (session_timeout_minutes BETWEEN 5 AND 120),
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_settings_singleton
  ON public.tenant_settings ((true));

DROP TRIGGER IF EXISTS update_tenant_settings_updated_at ON public.tenant_settings;
CREATE TRIGGER update_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_select_public ON public.tenant_settings;
CREATE POLICY tenant_settings_select_public
ON public.tenant_settings
FOR SELECT
TO anon, authenticated
USING (true);

REVOKE ALL ON public.tenant_settings FROM PUBLIC;
GRANT SELECT ON public.tenant_settings TO anon, authenticated, service_role;

INSERT INTO public.tenant_settings (
  timezone,
  date_format,
  email_notifications_enabled,
  session_timeout_minutes,
  maintenance_mode
)
VALUES (
  'Asia/Kuala_Lumpur',
  'DD/MM/YYYY',
  true,
  30,
  false
)
ON CONFLICT ((true)) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tenant_settings_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings_id uuid NOT NULL REFERENCES public.tenant_settings(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  old_values jsonb,
  new_values jsonb NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_role public.app_role,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_audit_log_settings_changed_at
  ON public.tenant_settings_audit_log (settings_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_audit_log_changed_by_changed_at
  ON public.tenant_settings_audit_log (changed_by, changed_at DESC);

ALTER TABLE public.tenant_settings_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_settings_audit_log_select_privileged ON public.tenant_settings_audit_log;
CREATE POLICY tenant_settings_audit_log_select_privileged
ON public.tenant_settings_audit_log
FOR SELECT
TO authenticated
USING (
  public.admin_has_capability(
    (select public.request_user_id()),
    'view_admin_audit_log'::public.admin_capability
  )
);

REVOKE ALL ON public.tenant_settings_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.tenant_settings_audit_log TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_upsert_tenant_settings(jsonb, text);
CREATE OR REPLACE FUNCTION public.admin_upsert_tenant_settings(
  _updates jsonb,
  _reason text
)
RETURNS public.tenant_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.tenant_settings%ROWTYPE;
  v_result public.tenant_settings%ROWTYPE;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_admin_settings'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_admin_settings capability is required'
      USING ERRCODE = '42501';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  requester_role := public.get_user_role(requester_id);

  SELECT *
  INTO v_existing
  FROM public.tenant_settings
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.tenant_settings (
      timezone,
      date_format,
      email_notifications_enabled,
      session_timeout_minutes,
      maintenance_mode,
      updated_by
    )
    VALUES (
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'timezone'), ''), 'Asia/Kuala_Lumpur'),
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'date_format'), ''), 'DD/MM/YYYY'),
      COALESCE((_updates ->> 'email_notifications_enabled')::boolean, true),
      COALESCE((_updates ->> 'session_timeout_minutes')::integer, 30),
      COALESCE((_updates ->> 'maintenance_mode')::boolean, false),
      requester_id
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.tenant_settings
    SET timezone = CASE
          WHEN _updates ? 'timezone' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'timezone'), ''), v_existing.timezone)
          ELSE v_existing.timezone
        END,
        date_format = CASE
          WHEN _updates ? 'date_format' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'date_format'), ''), v_existing.date_format)
          ELSE v_existing.date_format
        END,
        email_notifications_enabled = CASE
          WHEN _updates ? 'email_notifications_enabled' THEN COALESCE((_updates ->> 'email_notifications_enabled')::boolean, v_existing.email_notifications_enabled)
          ELSE v_existing.email_notifications_enabled
        END,
        session_timeout_minutes = CASE
          WHEN _updates ? 'session_timeout_minutes' THEN GREATEST(5, LEAST(120, COALESCE((_updates ->> 'session_timeout_minutes')::integer, v_existing.session_timeout_minutes)))
          ELSE v_existing.session_timeout_minutes
        END,
        maintenance_mode = CASE
          WHEN _updates ? 'maintenance_mode' THEN COALESCE((_updates ->> 'maintenance_mode')::boolean, v_existing.maintenance_mode)
          ELSE v_existing.maintenance_mode
        END,
        updated_by = requester_id
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO public.tenant_settings_audit_log (
    settings_id,
    reason,
    old_values,
    new_values,
    changed_by,
    changed_by_role
  )
  VALUES (
    v_result.id,
    v_reason,
    CASE WHEN v_existing.id IS NULL THEN NULL ELSE to_jsonb(v_existing) END,
    to_jsonb(v_result),
    requester_id,
    requester_role
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_upsert_tenant_settings(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_tenant_settings(jsonb, text) TO authenticated, service_role;

COMMIT;
