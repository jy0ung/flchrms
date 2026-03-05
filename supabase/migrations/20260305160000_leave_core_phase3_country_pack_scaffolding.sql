BEGIN;

-- ============================================================================
-- Enterprise Leave Core (Malaysia-first) - Phase 3 Country Pack Scaffolding
-- ============================================================================
-- Slice 3 scope:
-- 1) Country/statutory pack entities and versioning.
-- 2) Resolver that maps legal entity/location to active pack.
-- 3) Compatibility bridge to active policy version lookup.
-- 4) Malaysia default pack backfill (mapped to existing default_my policy set).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leave_country_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  country_code text NOT NULL DEFAULT 'MY',
  legal_entity text,
  location_code text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (country_code ~ '^[A-Z]{2}$')
);

CREATE TABLE IF NOT EXISTS public.leave_country_pack_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_pack_id uuid NOT NULL REFERENCES public.leave_country_packs(id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no > 0),
  effective_from date NOT NULL,
  effective_to date,
  is_published boolean NOT NULL DEFAULT false,
  policy_set_id uuid REFERENCES public.leave_policy_sets(id) ON DELETE SET NULL,
  statutory_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_pack_id, version_no),
  UNIQUE (country_pack_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

DROP TRIGGER IF EXISTS update_leave_country_packs_updated_at ON public.leave_country_packs;
CREATE TRIGGER update_leave_country_packs_updated_at
BEFORE UPDATE ON public.leave_country_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_country_pack_versions_updated_at ON public.leave_country_pack_versions;
CREATE TRIGGER update_leave_country_pack_versions_updated_at
BEFORE UPDATE ON public.leave_country_pack_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leave_country_packs_country_active
  ON public.leave_country_packs (country_code, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_country_packs_context
  ON public.leave_country_packs (country_code, legal_entity, location_code);

CREATE INDEX IF NOT EXISTS idx_leave_country_pack_versions_effective
  ON public.leave_country_pack_versions (country_pack_id, is_published, effective_from DESC);

ALTER TABLE public.leave_country_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_country_pack_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_country_packs_select_authenticated ON public.leave_country_packs;
CREATE POLICY leave_country_packs_select_authenticated
ON public.leave_country_packs
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_country_packs_manage_policy_admin ON public.leave_country_packs;
CREATE POLICY leave_country_packs_manage_policy_admin
ON public.leave_country_packs
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_country_pack_versions_select_authenticated ON public.leave_country_pack_versions;
CREATE POLICY leave_country_pack_versions_select_authenticated
ON public.leave_country_pack_versions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_country_pack_versions_manage_policy_admin ON public.leave_country_pack_versions;
CREATE POLICY leave_country_pack_versions_manage_policy_admin
ON public.leave_country_pack_versions
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_country_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_country_pack_versions TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_resolve_active_country_pack(
  _as_of date DEFAULT CURRENT_DATE,
  _legal_entity text DEFAULT NULL,
  _location_code text DEFAULT NULL,
  _country_code text DEFAULT 'MY'
)
RETURNS TABLE (
  country_pack_id uuid,
  country_pack_version_id uuid,
  policy_set_id uuid,
  pack_code text,
  country_code text,
  legal_entity text,
  location_code text,
  resolved_by text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  resolved record;
BEGIN
  SELECT
    cp.id AS country_pack_id,
    cpv.id AS country_pack_version_id,
    cpv.policy_set_id,
    cp.pack_code,
    cp.country_code,
    cp.legal_entity,
    cp.location_code
  INTO resolved
  FROM public.leave_country_packs cp
  JOIN public.leave_country_pack_versions cpv
    ON cpv.country_pack_id = cp.id
  WHERE cp.is_active = true
    AND cpv.is_published = true
    AND cp.country_code = COALESCE(NULLIF(upper(_country_code), ''), 'MY')
    AND cpv.effective_from <= _as_of
    AND (cpv.effective_to IS NULL OR cpv.effective_to >= _as_of)
    AND (
      (_legal_entity IS NULL AND cp.legal_entity IS NULL)
      OR (
        _legal_entity IS NOT NULL
        AND (cp.legal_entity IS NULL OR lower(cp.legal_entity) = lower(_legal_entity))
      )
    )
    AND (
      (_location_code IS NULL AND cp.location_code IS NULL)
      OR (
        _location_code IS NOT NULL
        AND (cp.location_code IS NULL OR lower(cp.location_code) = lower(_location_code))
      )
    )
  ORDER BY
    CASE
      WHEN _legal_entity IS NOT NULL
           AND cp.legal_entity IS NOT NULL
           AND lower(cp.legal_entity) = lower(_legal_entity)
      THEN 1 ELSE 0
    END DESC,
    CASE
      WHEN _location_code IS NOT NULL
           AND cp.location_code IS NOT NULL
           AND lower(cp.location_code) = lower(_location_code)
      THEN 1 ELSE 0
    END DESC,
    cpv.effective_from DESC,
    cpv.version_no DESC
  LIMIT 1;

  IF FOUND THEN
    country_pack_id := resolved.country_pack_id;
    country_pack_version_id := resolved.country_pack_version_id;
    policy_set_id := resolved.policy_set_id;
    pack_code := resolved.pack_code;
    country_code := resolved.country_code;
    legal_entity := resolved.legal_entity;
    location_code := resolved.location_code;
    resolved_by := 'country_pack';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT ps.id
  INTO resolved
  FROM public.leave_policy_sets ps
  WHERE ps.is_active = true
    AND ps.policy_key = 'default_my'
  ORDER BY ps.updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    country_pack_id := NULL;
    country_pack_version_id := NULL;
    policy_set_id := resolved.id;
    pack_code := 'default_my_fallback';
    country_code := COALESCE(NULLIF(upper(_country_code), ''), 'MY');
    legal_entity := _legal_entity;
    location_code := _location_code;
    resolved_by := 'default_policy_fallback';
    RETURN NEXT;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_resolve_active_country_pack(date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_resolve_active_country_pack(date, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_country_pack_context(
  _as_of date DEFAULT CURRENT_DATE,
  _legal_entity text DEFAULT NULL,
  _location_code text DEFAULT NULL,
  _country_code text DEFAULT 'MY'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  ctx record;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO ctx
  FROM public.leave_resolve_active_country_pack(_as_of, _legal_entity, _location_code, _country_code)
  LIMIT 1;

  IF NOT FOUND OR ctx.policy_set_id IS NULL THEN
    RAISE EXCEPTION 'No active country pack context found.'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'country_pack_id', ctx.country_pack_id,
    'country_pack_version_id', ctx.country_pack_version_id,
    'policy_set_id', ctx.policy_set_id,
    'pack_code', ctx.pack_code,
    'country_code', ctx.country_code,
    'legal_entity', ctx.legal_entity,
    'location_code', ctx.location_code,
    'resolved_by', ctx.resolved_by,
    'as_of', _as_of
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_country_pack_context(date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_country_pack_context(date, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_active_policy_version_for_context(
  _as_of date DEFAULT CURRENT_DATE,
  _legal_entity text DEFAULT NULL,
  _location_code text DEFAULT NULL,
  _country_code text DEFAULT 'MY'
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  resolved record;
  active_policy_version_id uuid;
BEGIN
  SELECT *
  INTO resolved
  FROM public.leave_resolve_active_country_pack(_as_of, _legal_entity, _location_code, _country_code)
  LIMIT 1;

  IF FOUND AND resolved.policy_set_id IS NOT NULL THEN
    SELECT pv.id
    INTO active_policy_version_id
    FROM public.leave_policy_versions pv
    WHERE pv.policy_set_id = resolved.policy_set_id
      AND pv.is_published = true
      AND pv.effective_from <= _as_of
      AND (pv.effective_to IS NULL OR pv.effective_to >= _as_of)
    ORDER BY pv.effective_from DESC, pv.version_no DESC
    LIMIT 1;

    IF active_policy_version_id IS NOT NULL THEN
      RETURN active_policy_version_id;
    END IF;
  END IF;

  SELECT pv.id
  INTO active_policy_version_id
  FROM public.leave_policy_sets ps
  JOIN public.leave_policy_versions pv
    ON pv.policy_set_id = ps.id
  WHERE ps.is_active = true
    AND ps.policy_key = 'default_my'
    AND pv.is_published = true
    AND pv.effective_from <= _as_of
    AND (pv.effective_to IS NULL OR pv.effective_to >= _as_of)
  ORDER BY pv.effective_from DESC, pv.version_no DESC
  LIMIT 1;

  RETURN active_policy_version_id;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_active_policy_version_for_context(date, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_active_policy_version_for_context(date, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_active_policy_version(_as_of date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT public.leave_get_active_policy_version_for_context(_as_of, NULL, NULL, 'MY');
$$;

REVOKE ALL ON FUNCTION public.leave_get_active_policy_version(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_active_policy_version(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_active_policy_version_for_employee(
  _employee_id uuid,
  _as_of date DEFAULT CURRENT_DATE,
  _country_code text DEFAULT 'MY'
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  employee_location text;
BEGIN
  IF _employee_id IS NULL THEN
    RETURN public.leave_get_active_policy_version_for_context(_as_of, NULL, NULL, _country_code);
  END IF;

  SELECT p.work_location
  INTO employee_location
  FROM public.profiles p
  WHERE p.id = _employee_id;

  RETURN public.leave_get_active_policy_version_for_context(_as_of, NULL, employee_location, _country_code);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_active_policy_version_for_employee(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_active_policy_version_for_employee(uuid, date, text) TO authenticated, service_role;

WITH default_policy_set AS (
  SELECT ps.id
  FROM public.leave_policy_sets ps
  WHERE ps.policy_key = 'default_my'
  ORDER BY ps.updated_at DESC
  LIMIT 1
),
upsert_pack AS (
  INSERT INTO public.leave_country_packs (
    pack_code,
    name,
    description,
    country_code,
    legal_entity,
    location_code,
    is_active,
    metadata,
    created_by
  )
  VALUES (
    'MY_DEFAULT',
    'Malaysia Default Statutory Pack',
    'Default Malaysia country-pack linked to baseline leave policy set.',
    'MY',
    NULL,
    NULL,
    true,
    jsonb_build_object('seed', '20260305160000_leave_core_phase3_country_pack_scaffolding'),
    NULL
  )
  ON CONFLICT (pack_code) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    country_code = EXCLUDED.country_code,
    legal_entity = EXCLUDED.legal_entity,
    location_code = EXCLUDED.location_code,
    is_active = true,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id
)
INSERT INTO public.leave_country_pack_versions (
  country_pack_id,
  version_no,
  effective_from,
  effective_to,
  is_published,
  policy_set_id,
  statutory_rules,
  metadata,
  created_by
)
SELECT
  up.id,
  1,
  DATE '2026-01-01',
  NULL,
  true,
  dps.id,
  jsonb_build_object(
    'country', 'MY',
    'pack', 'default',
    'phase', 'phase3',
    'notes', 'Malaysia-first baseline statutory rules placeholder'
  ),
  jsonb_build_object('seed', true),
  NULL
FROM upsert_pack up
CROSS JOIN default_policy_set dps
ON CONFLICT (country_pack_id, version_no) DO UPDATE
SET
  effective_from = EXCLUDED.effective_from,
  effective_to = EXCLUDED.effective_to,
  is_published = true,
  policy_set_id = EXCLUDED.policy_set_id,
  statutory_rules = EXCLUDED.statutory_rules,
  metadata = EXCLUDED.metadata,
  updated_at = now();

COMMIT;
