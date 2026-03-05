-- =============================================================================
-- Enterprise Leave Core (Malaysia-first) - Phase 1 Foundation
-- =============================================================================
-- Goals:
-- 1) Introduce versioned leave policy data structures.
-- 2) Add balance ledger + snapshots without breaking existing leave flows.
-- 3) Ship v2 leave RPCs (preview/submit/decide/cancel + accrual/close/export).
-- 4) Preserve compatibility with existing leave_requests reads/mutations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Shared auth helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_leave_policy(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::public.app_role)
    OR public.has_role(_user_id, 'hr'::public.app_role)
    OR public.has_role(_user_id, 'director'::public.app_role);
$$;

REVOKE ALL ON FUNCTION public.can_manage_leave_policy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_leave_policy(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_access_leave_employee(_actor_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    _actor_id = _employee_id
    OR public.has_role(_actor_id, 'admin'::public.app_role)
    OR public.has_role(_actor_id, 'hr'::public.app_role)
    OR public.has_role(_actor_id, 'director'::public.app_role)
    OR (
      public.has_role(_actor_id, 'manager'::public.app_role)
      AND (
        public.is_manager_of(_actor_id, _employee_id)
        OR public.is_department_manager(_actor_id, _employee_id)
      )
    )
    OR (
      public.has_role(_actor_id, 'general_manager'::public.app_role)
      AND (
        public.is_manager_of(_actor_id, _employee_id)
        OR public.is_department_manager(_actor_id, _employee_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_leave_employee(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_leave_employee(uuid, uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Compatibility additions on leave_requests (existing contract stays readable)
-- ---------------------------------------------------------------------------
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS requested_units numeric(6,2),
  ADD COLUMN IF NOT EXISTS policy_version_id uuid,
  ADD COLUMN IF NOT EXISTS decision_trace jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.leave_requests
SET requested_units = COALESCE(requested_units, days_count::numeric)
WHERE requested_units IS NULL;

ALTER TABLE public.leave_requests
  ALTER COLUMN requested_units SET DEFAULT 1,
  ALTER COLUMN requested_units SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_leave_requests_requested_units_positive'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_requested_units_positive
      CHECK (requested_units > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leave_requests_policy_version_id
  ON public.leave_requests (policy_version_id);

-- ---------------------------------------------------------------------------
-- New policy/configuration tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_policy_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  legal_entity text,
  country_code text NOT NULL DEFAULT 'MY',
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_set_id uuid NOT NULL REFERENCES public.leave_policy_sets(id) ON DELETE CASCADE,
  version_no integer NOT NULL CHECK (version_no > 0),
  effective_from date NOT NULL,
  effective_to date,
  is_published boolean NOT NULL DEFAULT false,
  rule_pack jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  accrual_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  workflow_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_set_id, version_no),
  UNIQUE (policy_set_id, effective_from),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.leave_type_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id uuid NOT NULL REFERENCES public.leave_policy_versions(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  unit text NOT NULL DEFAULT 'day' CHECK (unit IN ('day', 'half_day', 'hour')),
  allow_negative_balance boolean NOT NULL DEFAULT false,
  max_consecutive_days integer CHECK (max_consecutive_days IS NULL OR max_consecutive_days > 0),
  min_notice_days integer NOT NULL DEFAULT 0 CHECK (min_notice_days >= 0),
  requires_document boolean NOT NULL DEFAULT false,
  document_after_days numeric(6,2) CHECK (document_after_days IS NULL OR document_after_days >= 0),
  carryover_max_days numeric(6,2) NOT NULL DEFAULT 0 CHECK (carryover_max_days >= 0),
  carryover_expiry_month smallint CHECK (
    carryover_expiry_month IS NULL OR (carryover_expiry_month >= 1 AND carryover_expiry_month <= 12)
  ),
  proration_method text NOT NULL DEFAULT 'none'
    CHECK (proration_method IN ('none', 'calendar_daily', 'working_daily')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_version_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS public.leave_calendar_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_set_id uuid NOT NULL REFERENCES public.leave_policy_sets(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('holiday', 'blocked', 'half_day')),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  label text NOT NULL,
  affects_working_days boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.leave_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegate_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'leave_approval'
    CHECK (scope IN ('leave_approval', 'leave_cancellation', 'full')),
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to > valid_from),
  CHECK (delegator_user_id <> delegate_user_id)
);

CREATE TABLE IF NOT EXISTS public.leave_service_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_set_id uuid NOT NULL REFERENCES public.leave_policy_sets(id) ON DELETE CASCADE,
  workflow_stage text NOT NULL CHECK (workflow_stage IN ('manager', 'general_manager', 'director', 'hr')),
  target_hours integer NOT NULL CHECK (target_hours > 0),
  escalation_to_stage text CHECK (escalation_to_stage IN ('manager', 'general_manager', 'director', 'hr')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_set_id, workflow_stage)
);

-- ---------------------------------------------------------------------------
-- New operational tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_accrual_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  policy_version_id uuid REFERENCES public.leave_policy_versions(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('grant', 'accrue', 'consume', 'expire', 'adjust', 'encash', 'reverse')),
  occurred_on date NOT NULL,
  posted_at timestamptz NOT NULL DEFAULT now(),
  quantity numeric(12,2) NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'system',
  source_ref text,
  balance_after numeric(12,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  as_of_date date NOT NULL,
  balance numeric(12,2) NOT NULL,
  pending_balance numeric(12,2) NOT NULL DEFAULT 0,
  policy_version_id uuid REFERENCES public.leave_policy_versions(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, leave_type_id, as_of_date)
);

CREATE TABLE IF NOT EXISTS public.leave_request_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  stage text NOT NULL,
  action text NOT NULL CHECK (
    action IN (
      'submit',
      'approve',
      'reject',
      'request_document',
      'cancel_request',
      'cancel_approve',
      'cancel_reject',
      'override'
    )
  ),
  decided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at timestamptz NOT NULL DEFAULT now(),
  decision_reason text,
  comments text,
  from_status text,
  to_status text,
  from_cancellation_status text,
  to_cancellation_status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.leave_payroll_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CHECK (period_end >= period_start)
);

DROP TRIGGER IF EXISTS update_leave_policy_sets_updated_at ON public.leave_policy_sets;
CREATE TRIGGER update_leave_policy_sets_updated_at
BEFORE UPDATE ON public.leave_policy_sets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_policy_versions_updated_at ON public.leave_policy_versions;
CREATE TRIGGER update_leave_policy_versions_updated_at
BEFORE UPDATE ON public.leave_policy_versions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_type_rules_updated_at ON public.leave_type_rules;
CREATE TRIGGER update_leave_type_rules_updated_at
BEFORE UPDATE ON public.leave_type_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_calendar_rules_updated_at ON public.leave_calendar_rules;
CREATE TRIGGER update_leave_calendar_rules_updated_at
BEFORE UPDATE ON public.leave_calendar_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_delegations_updated_at ON public.leave_delegations;
CREATE TRIGGER update_leave_delegations_updated_at
BEFORE UPDATE ON public.leave_delegations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_service_levels_updated_at ON public.leave_service_levels;
CREATE TRIGGER update_leave_service_levels_updated_at
BEFORE UPDATE ON public.leave_service_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leave_policy_versions_effective
  ON public.leave_policy_versions (policy_set_id, is_published, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_leave_type_rules_leave_type
  ON public.leave_type_rules (leave_type_id);

CREATE INDEX IF NOT EXISTS idx_leave_calendar_rules_policy_dates
  ON public.leave_calendar_rules (policy_set_id, starts_on, ends_on);

CREATE INDEX IF NOT EXISTS idx_leave_delegations_lookup
  ON public.leave_delegations (delegator_user_id, status, valid_to DESC);

CREATE INDEX IF NOT EXISTS idx_leave_service_levels_policy
  ON public.leave_service_levels (policy_set_id);

CREATE INDEX IF NOT EXISTS idx_leave_accrual_ledger_employee_type_date
  ON public.leave_accrual_ledger (employee_id, leave_type_id, occurred_on DESC);

CREATE INDEX IF NOT EXISTS idx_leave_accrual_ledger_source_ref
  ON public.leave_accrual_ledger (source, source_ref);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_accrual_ledger_idempotency
  ON public.leave_accrual_ledger (employee_id, leave_type_id, source, source_ref)
  WHERE source_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leave_balance_snapshots_employee_date
  ON public.leave_balance_snapshots (employee_id, as_of_date DESC);

CREATE INDEX IF NOT EXISTS idx_leave_request_decisions_request_decided_at
  ON public.leave_request_decisions (leave_request_id, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_payroll_exports_period
  ON public.leave_payroll_exports (period_start, period_end, generated_at DESC);

-- ---------------------------------------------------------------------------
-- RLS + policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.leave_policy_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_type_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_calendar_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_service_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_accrual_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_request_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_payroll_exports ENABLE ROW LEVEL SECURITY;

-- leave_policy_sets
DROP POLICY IF EXISTS leave_policy_sets_select_authenticated ON public.leave_policy_sets;
CREATE POLICY leave_policy_sets_select_authenticated
ON public.leave_policy_sets
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_policy_sets_manage_policy_admin ON public.leave_policy_sets;
CREATE POLICY leave_policy_sets_manage_policy_admin
ON public.leave_policy_sets
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_policy_versions
DROP POLICY IF EXISTS leave_policy_versions_select_authenticated ON public.leave_policy_versions;
CREATE POLICY leave_policy_versions_select_authenticated
ON public.leave_policy_versions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_policy_versions_manage_policy_admin ON public.leave_policy_versions;
CREATE POLICY leave_policy_versions_manage_policy_admin
ON public.leave_policy_versions
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_type_rules
DROP POLICY IF EXISTS leave_type_rules_select_authenticated ON public.leave_type_rules;
CREATE POLICY leave_type_rules_select_authenticated
ON public.leave_type_rules
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_type_rules_manage_policy_admin ON public.leave_type_rules;
CREATE POLICY leave_type_rules_manage_policy_admin
ON public.leave_type_rules
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_calendar_rules
DROP POLICY IF EXISTS leave_calendar_rules_select_authenticated ON public.leave_calendar_rules;
CREATE POLICY leave_calendar_rules_select_authenticated
ON public.leave_calendar_rules
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_calendar_rules_manage_policy_admin ON public.leave_calendar_rules;
CREATE POLICY leave_calendar_rules_manage_policy_admin
ON public.leave_calendar_rules
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_service_levels
DROP POLICY IF EXISTS leave_service_levels_select_authenticated ON public.leave_service_levels;
CREATE POLICY leave_service_levels_select_authenticated
ON public.leave_service_levels
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_service_levels_manage_policy_admin ON public.leave_service_levels;
CREATE POLICY leave_service_levels_manage_policy_admin
ON public.leave_service_levels
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_delegations
DROP POLICY IF EXISTS leave_delegations_select_visibility ON public.leave_delegations;
CREATE POLICY leave_delegations_select_visibility
ON public.leave_delegations
FOR SELECT
TO authenticated
USING (
  delegator_user_id = public.request_user_id()
  OR delegate_user_id = public.request_user_id()
  OR public.can_manage_leave_policy(public.request_user_id())
);

DROP POLICY IF EXISTS leave_delegations_insert_allowed ON public.leave_delegations;
CREATE POLICY leave_delegations_insert_allowed
ON public.leave_delegations
FOR INSERT
TO authenticated
WITH CHECK (
  delegator_user_id = public.request_user_id()
  OR public.can_manage_leave_policy(public.request_user_id())
);

DROP POLICY IF EXISTS leave_delegations_update_allowed ON public.leave_delegations;
CREATE POLICY leave_delegations_update_allowed
ON public.leave_delegations
FOR UPDATE
TO authenticated
USING (
  delegator_user_id = public.request_user_id()
  OR public.can_manage_leave_policy(public.request_user_id())
)
WITH CHECK (
  delegator_user_id = public.request_user_id()
  OR public.can_manage_leave_policy(public.request_user_id())
);

DROP POLICY IF EXISTS leave_delegations_delete_allowed ON public.leave_delegations;
CREATE POLICY leave_delegations_delete_allowed
ON public.leave_delegations
FOR DELETE
TO authenticated
USING (
  delegator_user_id = public.request_user_id()
  OR public.can_manage_leave_policy(public.request_user_id())
);

-- leave_accrual_ledger
DROP POLICY IF EXISTS leave_accrual_ledger_select_visibility ON public.leave_accrual_ledger;
CREATE POLICY leave_accrual_ledger_select_visibility
ON public.leave_accrual_ledger
FOR SELECT
TO authenticated
USING (
  public.can_access_leave_employee(public.request_user_id(), employee_id)
);

DROP POLICY IF EXISTS leave_accrual_ledger_manage_policy_admin ON public.leave_accrual_ledger;
CREATE POLICY leave_accrual_ledger_manage_policy_admin
ON public.leave_accrual_ledger
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_balance_snapshots
DROP POLICY IF EXISTS leave_balance_snapshots_select_visibility ON public.leave_balance_snapshots;
CREATE POLICY leave_balance_snapshots_select_visibility
ON public.leave_balance_snapshots
FOR SELECT
TO authenticated
USING (
  public.can_access_leave_employee(public.request_user_id(), employee_id)
);

DROP POLICY IF EXISTS leave_balance_snapshots_manage_policy_admin ON public.leave_balance_snapshots;
CREATE POLICY leave_balance_snapshots_manage_policy_admin
ON public.leave_balance_snapshots
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

-- leave_request_decisions
DROP POLICY IF EXISTS leave_request_decisions_select_visibility ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_select_visibility
ON public.leave_request_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_decisions.leave_request_id
      AND public.can_access_leave_employee(public.request_user_id(), lr.employee_id)
  )
);

DROP POLICY IF EXISTS leave_request_decisions_insert_visibility ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_insert_visibility
ON public.leave_request_decisions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_decisions.leave_request_id
      AND public.can_access_leave_employee(public.request_user_id(), lr.employee_id)
  )
);

DROP POLICY IF EXISTS leave_request_decisions_manage_policy_admin ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_manage_policy_admin
ON public.leave_request_decisions
FOR UPDATE
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_request_decisions_delete_policy_admin ON public.leave_request_decisions;
CREATE POLICY leave_request_decisions_delete_policy_admin
ON public.leave_request_decisions
FOR DELETE
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()));

-- leave_payroll_exports
DROP POLICY IF EXISTS leave_payroll_exports_select_policy_admin ON public.leave_payroll_exports;
CREATE POLICY leave_payroll_exports_select_policy_admin
ON public.leave_payroll_exports
FOR SELECT
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_payroll_exports_manage_policy_admin ON public.leave_payroll_exports;
CREATE POLICY leave_payroll_exports_manage_policy_admin
ON public.leave_payroll_exports
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

GRANT SELECT ON public.leave_policy_sets TO authenticated;
GRANT SELECT ON public.leave_policy_versions TO authenticated;
GRANT SELECT ON public.leave_type_rules TO authenticated;
GRANT SELECT ON public.leave_calendar_rules TO authenticated;
GRANT SELECT ON public.leave_service_levels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_delegations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_accrual_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_balance_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_request_decisions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_payroll_exports TO authenticated;

-- ---------------------------------------------------------------------------
-- Default policy seed (Malaysia baseline)
-- ---------------------------------------------------------------------------
WITH seeded_set AS (
  INSERT INTO public.leave_policy_sets (
    policy_key,
    name,
    description,
    legal_entity,
    country_code,
    timezone,
    is_active,
    metadata,
    created_by
  )
  VALUES (
    'default_my',
    'Malaysia Default Leave Policy',
    'Baseline policy used during enterprise leave-core Phase 1 rollout.',
    'Default',
    'MY',
    'Asia/Kuala_Lumpur',
    true,
    jsonb_build_object('seed', '20260305110000_enterprise_leave_core_phase1'),
    NULL
  )
  ON CONFLICT (policy_key) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    country_code = EXCLUDED.country_code,
    timezone = EXCLUDED.timezone,
    is_active = true,
    updated_at = now()
  RETURNING id
)
INSERT INTO public.leave_policy_versions (
  policy_set_id,
  version_no,
  effective_from,
  is_published,
  rule_pack,
  validation_rules,
  accrual_rules,
  workflow_rules,
  metadata,
  created_by
)
SELECT
  s.id,
  1,
  DATE '2026-01-01',
  true,
  jsonb_build_object('country', 'MY', 'phase', 'phase1'),
  jsonb_build_object(
    'allow_overlap', false,
    'validate_blocked_dates', true,
    'notice_warning_only', true
  ),
  jsonb_build_object(
    'accrual_frequency', 'monthly',
    'proration_default', 'calendar_daily',
    'carryover_enabled_default', false
  ),
  jsonb_build_object('engine', 'existing_leave_workflow_bridge'),
  jsonb_build_object('seed', true),
  NULL
FROM seeded_set s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.leave_policy_versions v
  WHERE v.policy_set_id = s.id
    AND v.version_no = 1
);

INSERT INTO public.leave_type_rules (
  policy_version_id,
  leave_type_id,
  is_enabled,
  unit,
  allow_negative_balance,
  max_consecutive_days,
  min_notice_days,
  requires_document,
  document_after_days,
  carryover_max_days,
  carryover_expiry_month,
  proration_method,
  metadata
)
SELECT
  pv.id,
  lt.id,
  true,
  'day',
  false,
  NULL,
  COALESCE(lt.min_days, 0),
  COALESCE(lt.requires_document, false),
  NULL,
  0,
  NULL,
  'none',
  jsonb_build_object('seeded_from_leave_types', true)
FROM public.leave_policy_sets ps
JOIN public.leave_policy_versions pv
  ON pv.policy_set_id = ps.id
 AND pv.is_published = true
JOIN public.leave_types lt ON true
WHERE ps.policy_key = 'default_my'
  AND NOT EXISTS (
    SELECT 1
    FROM public.leave_type_rules r
    WHERE r.policy_version_id = pv.id
      AND r.leave_type_id = lt.id
  );

-- ---------------------------------------------------------------------------
-- Policy linkage helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_get_active_policy_version(_as_of date DEFAULT CURRENT_DATE)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT pv.id
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
$$;

REVOKE ALL ON FUNCTION public.leave_get_active_policy_version(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_active_policy_version(date) TO authenticated, service_role;

UPDATE public.leave_requests
SET policy_version_id = COALESCE(
  policy_version_id,
  public.leave_get_active_policy_version(COALESCE(start_date, CURRENT_DATE))
)
WHERE policy_version_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_requests_policy_version_id_fkey'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT leave_requests_policy_version_id_fkey
      FOREIGN KEY (policy_version_id)
      REFERENCES public.leave_policy_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.leave_compute_balance_snapshot(
  _employee_id uuid,
  _leave_type_id uuid,
  _as_of date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  entitled numeric,
  consumed numeric,
  pending numeric,
  available numeric,
  source text
)
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  has_ledger boolean := false;
  entitlement_total numeric := 0;
  consumed_total numeric := 0;
  pending_total numeric := 0;
  fallback_allowance numeric := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.leave_accrual_ledger l
    WHERE l.employee_id = _employee_id
      AND l.leave_type_id = _leave_type_id
      AND l.occurred_on <= _as_of
  )
  INTO has_ledger;

  IF has_ledger THEN
    SELECT
      COALESCE(SUM(CASE WHEN l.entry_type IN ('grant', 'accrue', 'adjust', 'reverse') THEN l.quantity ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN l.entry_type IN ('consume', 'expire', 'encash') THEN ABS(l.quantity) ELSE 0 END), 0)
    INTO entitlement_total, consumed_total
    FROM public.leave_accrual_ledger l
    WHERE l.employee_id = _employee_id
      AND l.leave_type_id = _leave_type_id
      AND l.occurred_on <= _as_of;

    source := 'ledger';
  ELSE
    SELECT COALESCE(lt.days_allowed, 0)::numeric
    INTO fallback_allowance
    FROM public.leave_types lt
    WHERE lt.id = _leave_type_id;

    entitlement_total := COALESCE(fallback_allowance, 0);

    SELECT COALESCE(SUM(COALESCE(lr.requested_units, lr.days_count::numeric)), 0)
    INTO consumed_total
    FROM public.leave_requests lr
    WHERE lr.employee_id = _employee_id
      AND lr.leave_type_id = _leave_type_id
      AND lr.start_date <= _as_of
      AND lr.status NOT IN ('rejected', 'cancelled')
      AND lr.final_approved_at IS NOT NULL;

    source := 'legacy_leave_requests';
  END IF;

  SELECT COALESCE(SUM(COALESCE(lr.requested_units, lr.days_count::numeric)), 0)
  INTO pending_total
  FROM public.leave_requests lr
  WHERE lr.employee_id = _employee_id
    AND lr.leave_type_id = _leave_type_id
    AND lr.start_date <= _as_of
    AND lr.status NOT IN ('rejected', 'cancelled')
    AND lr.final_approved_at IS NULL;

  entitled := COALESCE(entitlement_total, 0);
  consumed := COALESCE(consumed_total, 0);
  pending := COALESCE(pending_total, 0);
  available := entitled - consumed - pending;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_compute_balance_snapshot(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_compute_balance_snapshot(uuid, uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_request_v2(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  req public.leave_requests%ROWTYPE;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO req
  FROM public.leave_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_leave_employee(requester_id, req.employee_id) THEN
    RAISE EXCEPTION 'Not authorized to view this leave request.'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'request', to_jsonb(req),
    'decisions', COALESCE(
      (
        SELECT jsonb_agg(to_jsonb(d) ORDER BY d.decided_at ASC)
        FROM public.leave_request_decisions d
        WHERE d.leave_request_id = req.id
      ),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_request_v2(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_request_v2(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_get_my_balance_v2(_as_of date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  leave_type_id uuid,
  leave_type_name text,
  entitled numeric,
  consumed numeric,
  pending numeric,
  available numeric,
  source text,
  as_of_date date
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    lt.id,
    lt.name,
    b.entitled,
    b.consumed,
    b.pending,
    b.available,
    b.source,
    _as_of
  FROM public.leave_types lt
  CROSS JOIN LATERAL public.leave_compute_balance_snapshot(requester_id, lt.id, _as_of) AS b
  ORDER BY lt.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_my_balance_v2(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_my_balance_v2(date) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- v2 RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_preview_request(
  _employee_id uuid,
  _leave_type_id uuid,
  _start_date date,
  _end_date date,
  _days_count numeric DEFAULT NULL,
  _reason text DEFAULT NULL,
  _request_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  effective_employee_id uuid := COALESCE(_employee_id, requester_id);
  policy_version_id uuid;
  policy_set_id uuid;
  requested_units numeric(6,2);
  v_leave_type_name text;
  v_min_notice integer := 0;
  v_requires_document boolean := false;
  v_unit text := 'day';
  v_allow_negative boolean := false;
  v_max_consecutive integer := NULL;
  v_document_after_days numeric(6,2) := 0;
  overlap_count integer := 0;
  blocked_count integer := 0;
  notice_gap integer := 0;
  hard_errors jsonb := '[]'::jsonb;
  soft_warnings jsonb := '[]'::jsonb;
  bal record;
  can_submit boolean := false;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF effective_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_access_leave_employee(requester_id, effective_employee_id) THEN
    RAISE EXCEPTION 'Not authorized to preview leave for this employee.'
      USING ERRCODE = '42501';
  END IF;

  IF _leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Leave type is required.'
      USING ERRCODE = '22023';
  END IF;

  IF _start_date IS NULL OR _end_date IS NULL THEN
    RAISE EXCEPTION 'Start and end dates are required.'
      USING ERRCODE = '22023';
  END IF;

  IF _start_date > _end_date THEN
    RAISE EXCEPTION 'Start date must be on or before end date.'
      USING ERRCODE = '22023';
  END IF;

  requested_units := COALESCE(_days_count, (_end_date - _start_date + 1)::numeric);
  requested_units := ROUND(requested_units, 2);

  IF requested_units <= 0 THEN
    hard_errors := hard_errors || jsonb_build_array('Requested leave units must be greater than 0.');
  END IF;

  IF mod(requested_units * 2, 1) <> 0 THEN
    hard_errors := hard_errors || jsonb_build_array('Requested leave units must be in 0.5 increments.');
  END IF;

  SELECT lt.name, COALESCE(lt.min_days, 0), COALESCE(lt.requires_document, false)
  INTO v_leave_type_name, v_min_notice, v_requires_document
  FROM public.leave_types lt
  WHERE lt.id = _leave_type_id;

  IF NOT FOUND THEN
    hard_errors := hard_errors || jsonb_build_array('Leave type does not exist.');
  END IF;

  policy_version_id := public.leave_get_active_policy_version(_start_date);

  IF policy_version_id IS NOT NULL THEN
    SELECT
      COALESCE(r.unit, 'day'),
      COALESCE(r.allow_negative_balance, false),
      r.max_consecutive_days,
      COALESCE(r.min_notice_days, v_min_notice),
      COALESCE(r.requires_document, v_requires_document),
      COALESCE(r.document_after_days, 0),
      pv.policy_set_id
    INTO
      v_unit,
      v_allow_negative,
      v_max_consecutive,
      v_min_notice,
      v_requires_document,
      v_document_after_days,
      policy_set_id
    FROM public.leave_type_rules r
    JOIN public.leave_policy_versions pv
      ON pv.id = r.policy_version_id
    WHERE r.policy_version_id = policy_version_id
      AND r.leave_type_id = _leave_type_id
      AND r.is_enabled = true
    LIMIT 1;
  END IF;

  IF v_max_consecutive IS NOT NULL AND requested_units > v_max_consecutive THEN
    hard_errors := hard_errors || jsonb_build_array(
      format('Requested units exceed max consecutive days (%s).', v_max_consecutive)
    );
  END IF;

  SELECT COUNT(*)
  INTO overlap_count
  FROM public.leave_requests lr
  WHERE lr.employee_id = effective_employee_id
    AND lr.status NOT IN ('rejected', 'cancelled')
    AND (_request_id IS NULL OR lr.id <> _request_id)
    AND daterange(lr.start_date, lr.end_date, '[]') && daterange(_start_date, _end_date, '[]');

  IF overlap_count > 0 THEN
    hard_errors := hard_errors || jsonb_build_array('Leave date range overlaps an existing leave request.');
  END IF;

  IF policy_set_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO blocked_count
    FROM public.leave_calendar_rules c
    WHERE c.policy_set_id = policy_set_id
      AND c.rule_type = 'blocked'
      AND daterange(c.starts_on, c.ends_on, '[]') && daterange(_start_date, _end_date, '[]');

    IF blocked_count > 0 THEN
      hard_errors := hard_errors || jsonb_build_array('Selected dates include blocked leave dates.');
    END IF;
  END IF;

  SELECT *
  INTO bal
  FROM public.leave_compute_balance_snapshot(effective_employee_id, _leave_type_id, _start_date);

  IF COALESCE(v_allow_negative, false) = false
     AND COALESCE(bal.available, 0) < requested_units THEN
    hard_errors := hard_errors || jsonb_build_array(
      format(
        'Insufficient balance. Available: %s, requested: %s.',
        COALESCE(bal.available, 0),
        requested_units
      )
    );
  END IF;

  notice_gap := (_start_date - CURRENT_DATE);
  IF COALESCE(v_min_notice, 0) > 0 AND notice_gap < v_min_notice THEN
    soft_warnings := soft_warnings || jsonb_build_array(
      format(
        'Notice period is below policy target (%s day(s) required, %s day(s) provided).',
        v_min_notice,
        notice_gap
      )
    );
  END IF;

  IF COALESCE(v_document_after_days, 0) > 0 AND requested_units >= v_document_after_days THEN
    v_requires_document := true;
  END IF;

  can_submit := jsonb_array_length(hard_errors) = 0;

  RETURN jsonb_build_object(
    'can_submit', can_submit,
    'employee_id', effective_employee_id,
    'leave_type_id', _leave_type_id,
    'leave_type_name', v_leave_type_name,
    'start_date', _start_date,
    'end_date', _end_date,
    'requested_units', requested_units,
    'policy_version_id', policy_version_id,
    'rule_unit', v_unit,
    'requires_document', v_requires_document,
    'allow_negative_balance', v_allow_negative,
    'max_consecutive_days', v_max_consecutive,
    'min_notice_days', v_min_notice,
    'entitled_balance', COALESCE(bal.entitled, 0),
    'consumed_balance', COALESCE(bal.consumed, 0),
    'pending_balance', COALESCE(bal.pending, 0),
    'available_balance', COALESCE(bal.available, 0),
    'balance_source', COALESCE(bal.source, 'legacy_leave_requests'),
    'hard_errors', hard_errors,
    'soft_warnings', soft_warnings,
    'reason', _reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_preview_request(uuid, uuid, date, date, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_preview_request(uuid, uuid, date, date, numeric, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_submit_request_v2(
  _leave_type_id uuid,
  _start_date date,
  _end_date date,
  _days_count numeric DEFAULT NULL,
  _reason text DEFAULT NULL,
  _document_url text DEFAULT NULL,
  _idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  preview jsonb;
  requested_units numeric(6,2);
  policy_version_id uuid;
  legacy_days integer;
  created_request public.leave_requests%ROWTYPE;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  preview := public.leave_preview_request(
    requester_id,
    _leave_type_id,
    _start_date,
    _end_date,
    _days_count,
    _reason,
    NULL
  );

  IF COALESCE((preview ->> 'can_submit')::boolean, false) = false THEN
    RAISE EXCEPTION 'Leave request failed preview validation: %', preview -> 'hard_errors'
      USING ERRCODE = '22023';
  END IF;

  requested_units := COALESCE((preview ->> 'requested_units')::numeric, _days_count, (_end_date - _start_date + 1)::numeric);
  requested_units := ROUND(requested_units, 2);
  legacy_days := GREATEST(1, CEIL(requested_units))::integer;
  policy_version_id := NULLIF(preview ->> 'policy_version_id', '')::uuid;

  INSERT INTO public.leave_requests (
    employee_id,
    leave_type_id,
    start_date,
    end_date,
    days_count,
    requested_units,
    reason,
    document_url,
    status,
    policy_version_id,
    decision_trace
  )
  VALUES (
    requester_id,
    _leave_type_id,
    _start_date,
    _end_date,
    legacy_days,
    requested_units,
    _reason,
    _document_url,
    'pending',
    policy_version_id,
    jsonb_build_object(
      'submitted_via', 'leave_submit_request_v2',
      'submitted_at', now(),
      'idempotency_key', _idempotency_key,
      'preview', preview
    )
  )
  RETURNING *
  INTO created_request;

  INSERT INTO public.leave_request_decisions (
    leave_request_id,
    stage,
    action,
    decided_by,
    decision_reason,
    comments,
    to_status,
    metadata
  )
  VALUES (
    created_request.id,
    'employee_submit',
    'submit',
    requester_id,
    _reason,
    NULL,
    created_request.status,
    jsonb_build_object(
      'policy_version_id', policy_version_id,
      'requested_units', requested_units,
      'legacy_days_count', legacy_days
    )
  );

  RETURN jsonb_build_object(
    'request_id', created_request.id,
    'status', created_request.status,
    'requested_units', requested_units,
    'legacy_days_count', legacy_days,
    'policy_version_id', policy_version_id,
    'preview', preview
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_submit_request_v2(uuid, date, date, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_submit_request_v2(uuid, date, date, numeric, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_decide_request(
  _request_id uuid,
  _action text,
  _decision_reason text DEFAULT NULL,
  _comments text DEFAULT NULL,
  _expected_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  requester_role public.app_role;
  before_row public.leave_requests%ROWTYPE;
  updated_payload json;
  updated_json jsonb;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF _action NOT IN ('approve', 'reject', 'request_document') THEN
    RAISE EXCEPTION 'Invalid decision action: %', _action
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO before_row
  FROM public.leave_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.'
      USING ERRCODE = 'P0002';
  END IF;

  updated_payload := public.approve_leave_request(
    _request_id,
    _action,
    CASE WHEN _action = 'reject' THEN _decision_reason ELSE NULL END,
    _comments,
    false,
    _expected_status
  );

  updated_json := COALESCE(updated_payload::jsonb, '{}'::jsonb);
  requester_role := public.get_user_role(requester_id);

  INSERT INTO public.leave_request_decisions (
    leave_request_id,
    stage,
    action,
    decided_by,
    decision_reason,
    comments,
    from_status,
    to_status,
    from_cancellation_status,
    to_cancellation_status,
    metadata
  )
  VALUES (
    _request_id,
    COALESCE(requester_role::text, 'unknown'),
    _action,
    requester_id,
    _decision_reason,
    _comments,
    before_row.status,
    NULLIF(updated_json ->> 'status', ''),
    before_row.cancellation_status,
    NULLIF(updated_json ->> 'cancellation_status', ''),
    jsonb_build_object(
      'decided_via', 'leave_decide_request',
      'expected_status', _expected_status
    )
  );

  RETURN updated_json;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_decide_request(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_decide_request(uuid, text, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_cancel_request_v2(
  _request_id uuid,
  _reason text DEFAULT NULL,
  _comments text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  requester_role public.app_role;
  before_row public.leave_requests%ROWTYPE;
  after_row public.leave_requests%ROWTYPE;
  cancel_result text;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO before_row
  FROM public.leave_requests
  WHERE id = _request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.'
      USING ERRCODE = 'P0002';
  END IF;

  cancel_result := public.request_leave_cancellation(_request_id, _reason);

  SELECT *
  INTO after_row
  FROM public.leave_requests
  WHERE id = _request_id;

  requester_role := public.get_user_role(requester_id);

  INSERT INTO public.leave_request_decisions (
    leave_request_id,
    stage,
    action,
    decided_by,
    decision_reason,
    comments,
    from_status,
    to_status,
    from_cancellation_status,
    to_cancellation_status,
    metadata
  )
  VALUES (
    _request_id,
    COALESCE(requester_role::text, 'unknown'),
    'cancel_request',
    requester_id,
    _reason,
    _comments,
    before_row.status,
    after_row.status,
    before_row.cancellation_status,
    after_row.cancellation_status,
    jsonb_build_object(
      'result', cancel_result,
      'decided_via', 'leave_cancel_request_v2'
    )
  );

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'result', cancel_result,
    'status', after_row.status,
    'cancellation_status', after_row.cancellation_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_cancel_request_v2(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_cancel_request_v2(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_run_accrual_cycle(
  _as_of date DEFAULT CURRENT_DATE,
  _employee_id uuid DEFAULT NULL,
  _dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  requester_role public.app_role;
  policy_version_id uuid;
  profile_row record;
  rule_row record;
  source_ref text;
  posted_count integer := 0;
  planned_count integer := 0;
  skipped_count integer := 0;
  amount numeric(12,2);
BEGIN
  requester_role := public.get_user_role(requester_id);
  IF requester_id IS NULL OR requester_role IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can run accrual cycles.'
      USING ERRCODE = '42501';
  END IF;

  policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF policy_version_id IS NULL THEN
    RAISE EXCEPTION 'No active leave policy version found for %.', _as_of
      USING ERRCODE = 'P0002';
  END IF;

  FOR profile_row IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.status <> 'terminated'
      AND (_employee_id IS NULL OR p.id = _employee_id)
  LOOP
    FOR rule_row IN
      SELECT
        r.leave_type_id,
        COALESCE(lt.days_allowed, 0)::numeric AS days_allowed
      FROM public.leave_type_rules r
      JOIN public.leave_types lt ON lt.id = r.leave_type_id
      WHERE r.policy_version_id = policy_version_id
        AND r.is_enabled = true
    LOOP
      IF rule_row.days_allowed <= 0 THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      amount := ROUND(rule_row.days_allowed / 12.0, 2);
      source_ref := format('monthly:%s:%s', to_char(_as_of, 'YYYY-MM'), rule_row.leave_type_id::text);

      IF EXISTS (
        SELECT 1
        FROM public.leave_accrual_ledger l
        WHERE l.employee_id = profile_row.id
          AND l.leave_type_id = rule_row.leave_type_id
          AND l.source = 'accrual_cycle'
          AND l.source_ref = source_ref
      ) THEN
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      planned_count := planned_count + 1;

      IF _dry_run THEN
        CONTINUE;
      END IF;

      INSERT INTO public.leave_accrual_ledger (
        employee_id,
        leave_type_id,
        policy_version_id,
        entry_type,
        occurred_on,
        quantity,
        reason,
        source,
        source_ref,
        metadata,
        created_by
      )
      VALUES (
        profile_row.id,
        rule_row.leave_type_id,
        policy_version_id,
        'accrue',
        _as_of,
        amount,
        format('Monthly accrual for %s', to_char(_as_of, 'YYYY-MM')),
        'accrual_cycle',
        source_ref,
        jsonb_build_object('run_as_of', _as_of, 'dry_run', _dry_run),
        requester_id
      );

      posted_count := posted_count + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', _as_of,
    'policy_version_id', policy_version_id,
    'dry_run', _dry_run,
    'planned_entries', planned_count,
    'posted_entries', posted_count,
    'skipped_entries', skipped_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_run_accrual_cycle(date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_run_accrual_cycle(date, uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_close_period(
  _period_start date,
  _period_end date,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  snapshot_count integer := 0;
  export_id uuid;
  active_policy_version_id uuid;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can close leave periods.'
      USING ERRCODE = '42501';
  END IF;

  IF _period_start IS NULL OR _period_end IS NULL OR _period_end < _period_start THEN
    RAISE EXCEPTION 'Invalid period range.'
      USING ERRCODE = '22023';
  END IF;

  active_policy_version_id := public.leave_get_active_policy_version(_period_end);

  INSERT INTO public.leave_balance_snapshots (
    employee_id,
    leave_type_id,
    as_of_date,
    balance,
    pending_balance,
    policy_version_id,
    metadata
  )
  SELECT
    p.id,
    lt.id,
    _period_end,
    b.available,
    b.pending,
    active_policy_version_id,
    jsonb_build_object(
      'period_start', _period_start,
      'period_end', _period_end,
      'closed_by', requester_id,
      'notes', _notes
    )
  FROM public.profiles p
  CROSS JOIN public.leave_types lt
  CROSS JOIN LATERAL public.leave_compute_balance_snapshot(p.id, lt.id, _period_end) AS b
  WHERE p.status <> 'terminated'
  ON CONFLICT (employee_id, leave_type_id, as_of_date)
  DO UPDATE SET
    balance = EXCLUDED.balance,
    pending_balance = EXCLUDED.pending_balance,
    policy_version_id = EXCLUDED.policy_version_id,
    metadata = EXCLUDED.metadata,
    created_at = now();

  GET DIAGNOSTICS snapshot_count = ROW_COUNT;

  INSERT INTO public.leave_payroll_exports (
    period_start,
    period_end,
    generated_by,
    status,
    payload,
    metadata
  )
  VALUES (
    _period_start,
    _period_end,
    requester_id,
    'pending',
    '{}'::jsonb,
    jsonb_build_object(
      'source', 'leave_close_period',
      'notes', _notes
    )
  )
  RETURNING id INTO export_id;

  RETURN jsonb_build_object(
    'period_start', _period_start,
    'period_end', _period_end,
    'snapshot_rows', snapshot_count,
    'payroll_export_id', export_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_close_period(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_close_period(date, date, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_export_payroll_inputs(
  _period_start date,
  _period_end date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  export_payload jsonb := '[]'::jsonb;
  export_id uuid;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can export leave payroll inputs.'
      USING ERRCODE = '42501';
  END IF;

  IF _period_start IS NULL OR _period_end IS NULL OR _period_end < _period_start THEN
    RAISE EXCEPTION 'Invalid period range.'
      USING ERRCODE = '22023';
  END IF;

  WITH approved AS (
    SELECT
      lr.employee_id,
      lr.leave_type_id,
      SUM(COALESCE(lr.requested_units, lr.days_count::numeric)) AS approved_units,
      SUM(
        CASE WHEN lt.is_paid THEN 0 ELSE COALESCE(lr.requested_units, lr.days_count::numeric) END
      ) AS unpaid_units,
      COUNT(*) AS request_count
    FROM public.leave_requests lr
    JOIN public.leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.status NOT IN ('rejected', 'cancelled')
      AND lr.final_approved_at IS NOT NULL
      AND daterange(lr.start_date, lr.end_date, '[]') && daterange(_period_start, _period_end, '[]')
    GROUP BY lr.employee_id, lr.leave_type_id
  ),
  by_employee AS (
    SELECT
      a.employee_id,
      jsonb_agg(
        jsonb_build_object(
          'leave_type_id', a.leave_type_id,
          'approved_units', a.approved_units,
          'unpaid_units', a.unpaid_units,
          'request_count', a.request_count
        )
        ORDER BY a.leave_type_id
      ) AS leave_items,
      SUM(a.approved_units) AS total_units,
      SUM(a.unpaid_units) AS total_unpaid_units
    FROM approved a
    GROUP BY a.employee_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'employee_id', e.employee_id,
        'total_units', e.total_units,
        'total_unpaid_units', e.total_unpaid_units,
        'leave_items', e.leave_items
      )
      ORDER BY e.employee_id
    ),
    '[]'::jsonb
  )
  INTO export_payload
  FROM by_employee e;

  INSERT INTO public.leave_payroll_exports (
    period_start,
    period_end,
    generated_by,
    status,
    payload,
    metadata
  )
  VALUES (
    _period_start,
    _period_end,
    requester_id,
    'completed',
    export_payload,
    jsonb_build_object(
      'source', 'leave_export_payroll_inputs',
      'generated_at', now()
    )
  )
  RETURNING id INTO export_id;

  RETURN jsonb_build_object(
    'export_id', export_id,
    'period_start', _period_start,
    'period_end', _period_end,
    'employees', jsonb_array_length(export_payload),
    'payload', export_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_export_payroll_inputs(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_export_payroll_inputs(date, date) TO authenticated, service_role;
