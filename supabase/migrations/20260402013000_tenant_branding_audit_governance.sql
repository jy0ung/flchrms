-- Governance hardening for tenant branding:
-- 1) Route branding writes through a capability-gated RPC.
-- 2) Require an operator reason for every tenant branding change.
-- 3) Persist an append-only audit log for review in governance history.

DROP POLICY IF EXISTS tenant_branding_update_admin_hr ON public.tenant_branding;
DROP POLICY IF EXISTS tenant_branding_insert_admin_hr ON public.tenant_branding;

CREATE TABLE IF NOT EXISTS public.tenant_branding_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branding_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_role public.app_role,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_audit_log_branding_changed_at
  ON public.tenant_branding_audit_log (branding_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_branding_audit_log_changed_by_changed_at
  ON public.tenant_branding_audit_log (changed_by, changed_at DESC);

ALTER TABLE public.tenant_branding_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_branding_audit_log_select_privileged ON public.tenant_branding_audit_log;
CREATE POLICY tenant_branding_audit_log_select_privileged
ON public.tenant_branding_audit_log
FOR SELECT
TO authenticated
USING (
  public.admin_has_capability(
    (select public.request_user_id()),
    'view_admin_audit_log'::public.admin_capability
  )
);

REVOKE ALL ON public.tenant_branding_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.tenant_branding_audit_log TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_upsert_tenant_branding(jsonb, text);
CREATE OR REPLACE FUNCTION public.admin_upsert_tenant_branding(
  _updates jsonb,
  _reason text
)
RETURNS public.tenant_branding
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.tenant_branding%ROWTYPE;
  v_result public.tenant_branding%ROWTYPE;
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
  FROM public.tenant_branding
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.tenant_branding (
      company_name,
      company_tagline,
      logo_url,
      favicon_url,
      login_background_url,
      primary_color,
      accent_color,
      sidebar_color,
      updated_by
    )
    VALUES (
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'company_name'), ''), 'FL Group'),
      CASE
        WHEN _updates ? 'company_tagline' THEN NULLIF(pg_catalog.btrim(_updates ->> 'company_tagline'), '')
        ELSE 'HR Management System'
      END,
      CASE WHEN _updates ? 'logo_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'logo_url'), '') ELSE NULL END,
      CASE WHEN _updates ? 'favicon_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'favicon_url'), '') ELSE NULL END,
      CASE WHEN _updates ? 'login_background_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'login_background_url'), '') ELSE NULL END,
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'primary_color'), ''), '221 83% 53%'),
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'accent_color'), ''), '142 71% 45%'),
      COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'sidebar_color'), ''), '0 0% 3%'),
      requester_id
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.tenant_branding
    SET company_name = CASE
          WHEN _updates ? 'company_name' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'company_name'), ''), v_existing.company_name)
          ELSE v_existing.company_name
        END,
        company_tagline = CASE
          WHEN _updates ? 'company_tagline' THEN NULLIF(pg_catalog.btrim(_updates ->> 'company_tagline'), '')
          ELSE v_existing.company_tagline
        END,
        logo_url = CASE
          WHEN _updates ? 'logo_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'logo_url'), '')
          ELSE v_existing.logo_url
        END,
        favicon_url = CASE
          WHEN _updates ? 'favicon_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'favicon_url'), '')
          ELSE v_existing.favicon_url
        END,
        login_background_url = CASE
          WHEN _updates ? 'login_background_url' THEN NULLIF(pg_catalog.btrim(_updates ->> 'login_background_url'), '')
          ELSE v_existing.login_background_url
        END,
        primary_color = CASE
          WHEN _updates ? 'primary_color' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'primary_color'), ''), v_existing.primary_color)
          ELSE v_existing.primary_color
        END,
        accent_color = CASE
          WHEN _updates ? 'accent_color' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'accent_color'), ''), v_existing.accent_color)
          ELSE v_existing.accent_color
        END,
        sidebar_color = CASE
          WHEN _updates ? 'sidebar_color' THEN COALESCE(NULLIF(pg_catalog.btrim(_updates ->> 'sidebar_color'), ''), v_existing.sidebar_color)
          ELSE v_existing.sidebar_color
        END,
        updated_by = requester_id
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO public.tenant_branding_audit_log (
    branding_id,
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

REVOKE ALL ON FUNCTION public.admin_upsert_tenant_branding(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_tenant_branding(jsonb, text) TO authenticated, service_role;
