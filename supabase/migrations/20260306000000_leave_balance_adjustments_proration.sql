-- =============================================================================
-- Hire-Date Prorated Leave + Manual Adjustment Ledger
-- =============================================================================
-- Goals:
-- 1) Centralize leave balance computation in DB (single source of truth).
-- 2) Apply whole-month hire-date proration in calendar-year cycle.
-- 3) Add append-only manual adjustment ledger (delta days).
-- 4) Keep legacy RPC contract leave_get_my_balance_v2 compatible.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Manual adjustment ledger table (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_balance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  adjustment_days numeric(8,2) NOT NULL,
  effective_date date NOT NULL,
  reason text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leave_balance_adjustments_non_zero CHECK (adjustment_days <> 0),
  CONSTRAINT leave_balance_adjustments_half_day_increment CHECK (mod(adjustment_days * 2, 1) = 0),
  CONSTRAINT leave_balance_adjustments_reason_len CHECK (char_length(trim(reason)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_leave_balance_adjustments_employee_type_effective
  ON public.leave_balance_adjustments (employee_id, leave_type_id, effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_leave_balance_adjustments_effective_date
  ON public.leave_balance_adjustments (effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_leave_balance_adjustments_created_by_created_at
  ON public.leave_balance_adjustments (created_by, created_at DESC);

ALTER TABLE public.leave_balance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_balance_adjustments_select_visibility ON public.leave_balance_adjustments;
CREATE POLICY leave_balance_adjustments_select_visibility
ON public.leave_balance_adjustments
FOR SELECT
TO authenticated
USING (
  public.can_access_leave_employee(public.request_user_id(), employee_id)
  OR public.can_manage_leave_policy(public.request_user_id())
);

DROP POLICY IF EXISTS leave_balance_adjustments_insert_privileged ON public.leave_balance_adjustments;
CREATE POLICY leave_balance_adjustments_insert_privileged
ON public.leave_balance_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_leave_policy(public.request_user_id())
  AND created_by = public.request_user_id()
);

GRANT SELECT, INSERT ON public.leave_balance_adjustments TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_leave_balance_adjustments_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  RAISE EXCEPTION 'leave_balance_adjustments is append-only. Insert a compensating entry instead.'
    USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_leave_balance_adjustments_mutation() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zz_leave_balance_adjustments_no_update ON public.leave_balance_adjustments;
CREATE TRIGGER zz_leave_balance_adjustments_no_update
BEFORE UPDATE ON public.leave_balance_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_leave_balance_adjustments_mutation();

DROP TRIGGER IF EXISTS zz_leave_balance_adjustments_no_delete ON public.leave_balance_adjustments;
CREATE TRIGGER zz_leave_balance_adjustments_no_delete
BEFORE DELETE ON public.leave_balance_adjustments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_leave_balance_adjustments_mutation();

-- -----------------------------------------------------------------------------
-- 2) Balance computation helpers (calendar year, whole-month proration)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.leave_cycle_bounds(_as_of date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  cycle_start date,
  cycle_end date
)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    make_date(EXTRACT(YEAR FROM _as_of)::int, 1, 1) AS cycle_start,
    make_date(EXTRACT(YEAR FROM _as_of)::int, 12, 31) AS cycle_end;
$$;

REVOKE ALL ON FUNCTION public.leave_cycle_bounds(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_cycle_bounds(date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_split_units_for_cycle(
  _start_date date,
  _end_date date,
  _requested_units numeric,
  _cycle_start date,
  _cycle_end date
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  total_days integer;
  overlap_days integer;
  overlap_start date;
  overlap_end date;
BEGIN
  IF _requested_units IS NULL OR _requested_units <= 0 THEN
    RETURN 0;
  END IF;

  IF _start_date IS NULL OR _end_date IS NULL OR _end_date < _start_date THEN
    RETURN 0;
  END IF;

  total_days := (_end_date - _start_date + 1);
  IF total_days <= 0 THEN
    RETURN 0;
  END IF;

  overlap_start := GREATEST(_start_date, _cycle_start);
  overlap_end := LEAST(_end_date, _cycle_end);

  IF overlap_end < overlap_start THEN
    RETURN 0;
  END IF;

  overlap_days := overlap_end - overlap_start + 1;

  RETURN ROUND((_requested_units * overlap_days::numeric) / total_days::numeric, 2);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_split_units_for_cycle(date, date, numeric, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_split_units_for_cycle(date, date, numeric, date, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_auto_accrued_whole_month(
  _annual_entitlement numeric,
  _hire_date date,
  _as_of date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cycle_start date;
  cycle_end date;
  effective_hire date;
  as_of_clamped date;
  hire_month date;
  as_of_month date;
  months_eligible integer;
BEGIN
  IF COALESCE(_annual_entitlement, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT cb.cycle_start, cb.cycle_end
  INTO cycle_start, cycle_end
  FROM public.leave_cycle_bounds(_as_of) cb;

  effective_hire := GREATEST(COALESCE(_hire_date, cycle_start), cycle_start);
  as_of_clamped := LEAST(_as_of, cycle_end);

  IF effective_hire > cycle_end OR effective_hire > as_of_clamped THEN
    RETURN 0;
  END IF;

  hire_month := date_trunc('month', effective_hire)::date;
  as_of_month := date_trunc('month', as_of_clamped)::date;

  months_eligible :=
    (EXTRACT(YEAR FROM as_of_month)::int * 12 + EXTRACT(MONTH FROM as_of_month)::int)
    - (EXTRACT(YEAR FROM hire_month)::int * 12 + EXTRACT(MONTH FROM hire_month)::int)
    + 1;

  IF months_eligible <= 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((_annual_entitlement / 12.0) * months_eligible, 2);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_auto_accrued_whole_month(numeric, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_auto_accrued_whole_month(numeric, date, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_compute_employee_balance_row(
  _employee_id uuid,
  _leave_type_id uuid,
  _as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  leave_type_id uuid,
  leave_type_name text,
  annual_entitlement numeric,
  auto_accrued_days numeric,
  manual_adjustment_days numeric,
  entitled_days numeric,
  days_used numeric,
  days_pending numeric,
  days_remaining numeric,
  is_unlimited boolean,
  cycle_start date,
  cycle_end date,
  source text
)
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  v_leave_type_name text;
  v_annual_entitlement numeric := 0;
  v_auto_accrued numeric := 0;
  v_manual_adjustments numeric := 0;
  v_entitled numeric := 0;
  v_days_used numeric := 0;
  v_days_pending numeric := 0;
  v_days_remaining numeric := 0;
  v_is_unlimited boolean := false;
  v_hire_date date;
  v_cycle_start date;
  v_cycle_end date;
  v_as_of_clamped date;
  v_source text := 'proration_adjustment_v1';
  unlimited_sentinel numeric := 999999;
BEGIN
  IF _employee_id IS NULL OR _leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Employee id and leave type id are required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT lt.name, COALESCE(lt.days_allowed, 0)::numeric
  INTO v_leave_type_name, v_annual_entitlement
  FROM public.leave_types lt
  WHERE lt.id = _leave_type_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave type not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT p.hire_date
  INTO v_hire_date
  FROM public.profiles p
  WHERE p.id = _employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee profile not found.'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT cb.cycle_start, cb.cycle_end
  INTO v_cycle_start, v_cycle_end
  FROM public.leave_cycle_bounds(_as_of_date) cb;

  v_as_of_clamped := LEAST(_as_of_date, v_cycle_end);
  v_is_unlimited := (v_annual_entitlement = 0);

  IF v_is_unlimited THEN
    v_auto_accrued := 0;
    v_manual_adjustments := 0;
    v_entitled := unlimited_sentinel;
  ELSE
    v_auto_accrued := public.leave_auto_accrued_whole_month(v_annual_entitlement, v_hire_date, _as_of_date);

    SELECT COALESCE(SUM(a.adjustment_days), 0)
    INTO v_manual_adjustments
    FROM public.leave_balance_adjustments a
    WHERE a.employee_id = _employee_id
      AND a.leave_type_id = _leave_type_id
      AND a.effective_date >= v_cycle_start
      AND a.effective_date <= v_as_of_clamped;

    v_entitled := ROUND(v_auto_accrued + v_manual_adjustments, 2);
  END IF;

  SELECT COALESCE(
    SUM(
      public.leave_split_units_for_cycle(
        lr.start_date,
        lr.end_date,
        COALESCE(lr.requested_units, lr.days_count::numeric),
        v_cycle_start,
        v_cycle_end
      )
    ),
    0
  )
  INTO v_days_used
  FROM public.leave_requests lr
  WHERE lr.employee_id = _employee_id
    AND lr.leave_type_id = _leave_type_id
    AND lr.status NOT IN ('rejected', 'cancelled')
    AND lr.final_approved_at IS NOT NULL
    AND daterange(lr.start_date, lr.end_date, '[]') && daterange(v_cycle_start, v_cycle_end, '[]');

  SELECT COALESCE(
    SUM(
      public.leave_split_units_for_cycle(
        lr.start_date,
        lr.end_date,
        COALESCE(lr.requested_units, lr.days_count::numeric),
        v_cycle_start,
        v_cycle_end
      )
    ),
    0
  )
  INTO v_days_pending
  FROM public.leave_requests lr
  WHERE lr.employee_id = _employee_id
    AND lr.leave_type_id = _leave_type_id
    AND lr.status NOT IN ('rejected', 'cancelled')
    AND lr.final_approved_at IS NULL
    AND daterange(lr.start_date, lr.end_date, '[]') && daterange(v_cycle_start, v_cycle_end, '[]');

  IF v_is_unlimited THEN
    v_days_remaining := unlimited_sentinel;
  ELSE
    v_days_remaining := GREATEST(0, ROUND(v_entitled - v_days_used - v_days_pending, 2));
  END IF;

  RETURN QUERY
  SELECT
    _leave_type_id,
    v_leave_type_name,
    v_annual_entitlement,
    v_auto_accrued,
    v_manual_adjustments,
    v_entitled,
    ROUND(v_days_used, 2),
    ROUND(v_days_pending, 2),
    ROUND(v_days_remaining, 2),
    v_is_unlimited,
    v_cycle_start,
    v_cycle_end,
    v_source;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_compute_employee_balance_row(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_compute_employee_balance_row(uuid, uuid, date) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Public RPCs for balances and adjustments
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_employee_leave_balances(
  _employee_id uuid DEFAULT public.request_user_id(),
  _as_of_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  leave_type_id uuid,
  leave_type_name text,
  annual_entitlement numeric,
  auto_accrued_days numeric,
  manual_adjustment_days numeric,
  entitled_days numeric,
  days_used numeric,
  days_pending numeric,
  days_remaining numeric,
  is_unlimited boolean,
  cycle_start date,
  cycle_end date,
  source text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  target_employee_id uuid := COALESCE(_employee_id, requester_id);
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF target_employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.can_access_leave_employee(requester_id, target_employee_id)
    OR public.can_manage_leave_policy(requester_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read leave balances for this employee.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    b.leave_type_id,
    b.leave_type_name,
    b.annual_entitlement,
    b.auto_accrued_days,
    b.manual_adjustment_days,
    b.entitled_days,
    b.days_used,
    b.days_pending,
    b.days_remaining,
    b.is_unlimited,
    b.cycle_start,
    b.cycle_end,
    b.source
  FROM public.leave_types lt
  CROSS JOIN LATERAL public.leave_compute_employee_balance_row(target_employee_id, lt.id, _as_of_date) b
  ORDER BY lt.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_leave_balances(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_leave_balances(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_leave_balance_adjustment(
  _employee_id uuid,
  _leave_type_id uuid,
  _adjustment_days numeric,
  _effective_date date,
  _reason text,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.leave_balance_adjustments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  v_row public.leave_balance_adjustments%ROWTYPE;
  v_policy_version_id uuid;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can create leave balance adjustments.'
      USING ERRCODE = '42501';
  END IF;

  IF _employee_id IS NULL OR _leave_type_id IS NULL THEN
    RAISE EXCEPTION 'Employee and leave type are required.'
      USING ERRCODE = '22023';
  END IF;

  IF _effective_date IS NULL THEN
    RAISE EXCEPTION 'Effective date is required.'
      USING ERRCODE = '22023';
  END IF;

  IF _adjustment_days IS NULL OR _adjustment_days = 0 THEN
    RAISE EXCEPTION 'Adjustment days must be non-zero.'
      USING ERRCODE = '22023';
  END IF;

  IF mod(_adjustment_days * 2, 1) <> 0 THEN
    RAISE EXCEPTION 'Adjustment days must be in 0.5 increments.'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(char_length(trim(_reason)), 0) < 5 THEN
    RAISE EXCEPTION 'Reason must be at least 5 characters.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _employee_id) THEN
    RAISE EXCEPTION 'Employee profile not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.leave_types lt WHERE lt.id = _leave_type_id) THEN
    RAISE EXCEPTION 'Leave type not found.'
      USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.leave_balance_adjustments (
    employee_id,
    leave_type_id,
    adjustment_days,
    effective_date,
    reason,
    created_by,
    metadata
  )
  VALUES (
    _employee_id,
    _leave_type_id,
    ROUND(_adjustment_days, 2),
    _effective_date,
    trim(_reason),
    requester_id,
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING *
  INTO v_row;

  v_policy_version_id := public.leave_get_active_policy_version(_effective_date);

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
    v_row.employee_id,
    v_row.leave_type_id,
    v_policy_version_id,
    'adjust',
    v_row.effective_date,
    v_row.adjustment_days,
    v_row.reason,
    'manual_adjustment',
    format('adjustment:%s', v_row.id::text),
    jsonb_build_object(
      'adjustment_id', v_row.id,
      'effective_date', v_row.effective_date,
      'source', 'leave_balance_adjustments'
    ) || COALESCE(v_row.metadata, '{}'::jsonb),
    requester_id
  );

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_leave_balance_adjustment(uuid, uuid, numeric, date, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_leave_balance_adjustment(uuid, uuid, numeric, date, text, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_leave_balance_adjustments(
  _employee_id uuid,
  _leave_type_id uuid DEFAULT NULL,
  _from date DEFAULT NULL,
  _to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  employee_id uuid,
  leave_type_id uuid,
  leave_type_name text,
  adjustment_days numeric,
  effective_date date,
  reason text,
  created_by uuid,
  created_by_name text,
  metadata jsonb,
  created_at timestamptz
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

  IF _employee_id IS NULL THEN
    RAISE EXCEPTION 'Employee id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.can_access_leave_employee(requester_id, _employee_id)
    OR public.can_manage_leave_policy(requester_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to read leave balance adjustments for this employee.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.employee_id,
    a.leave_type_id,
    lt.name AS leave_type_name,
    a.adjustment_days,
    a.effective_date,
    a.reason,
    a.created_by,
    trim(concat(cb.first_name, ' ', cb.last_name)) AS created_by_name,
    a.metadata,
    a.created_at
  FROM public.leave_balance_adjustments a
  JOIN public.leave_types lt ON lt.id = a.leave_type_id
  LEFT JOIN public.profiles cb ON cb.id = a.created_by
  WHERE a.employee_id = _employee_id
    AND (_leave_type_id IS NULL OR a.leave_type_id = _leave_type_id)
    AND (_from IS NULL OR a.effective_date >= _from)
    AND (_to IS NULL OR a.effective_date <= _to)
  ORDER BY a.effective_date DESC, a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_leave_balance_adjustments(uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leave_balance_adjustments(uuid, uuid, date, date) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4) Compatibility wrappers + enforcement rebasing
-- -----------------------------------------------------------------------------
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
BEGIN
  RETURN QUERY
  SELECT
    b.entitled_days,
    b.days_used,
    b.days_pending,
    b.days_remaining,
    b.source
  FROM public.leave_compute_employee_balance_row(_employee_id, _leave_type_id, _as_of) b;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_compute_balance_snapshot(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_compute_balance_snapshot(uuid, uuid, date) TO authenticated, service_role;

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
    b.leave_type_id,
    b.leave_type_name,
    b.entitled_days,
    b.days_used,
    b.days_pending,
    b.days_remaining,
    b.source,
    _as_of
  FROM public.get_employee_leave_balances(requester_id, _as_of) b;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_get_my_balance_v2(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_get_my_balance_v2(date) TO authenticated, service_role;

-- Keep overlap trigger unchanged; only replace balance trigger logic.
CREATE OR REPLACE FUNCTION public.check_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  bal record;
  old_units numeric := 0;
  new_units numeric := 0;
  projected_remaining numeric := 0;
BEGIN
  IF NEW.employee_id IS NULL OR NEW.leave_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO bal
  FROM public.leave_compute_employee_balance_row(
    NEW.employee_id,
    NEW.leave_type_id,
    COALESCE(NEW.start_date, CURRENT_DATE)
  );

  IF COALESCE(bal.is_unlimited, false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status NOT IN ('rejected', 'cancelled') THEN
    old_units := public.leave_split_units_for_cycle(
      OLD.start_date,
      OLD.end_date,
      COALESCE(OLD.requested_units, OLD.days_count::numeric),
      bal.cycle_start,
      bal.cycle_end
    );
  END IF;

  IF NEW.status NOT IN ('rejected', 'cancelled') THEN
    new_units := public.leave_split_units_for_cycle(
      NEW.start_date,
      NEW.end_date,
      COALESCE(NEW.requested_units, NEW.days_count::numeric),
      bal.cycle_start,
      bal.cycle_end
    );
  END IF;

  projected_remaining := COALESCE(bal.days_remaining, 0) + COALESCE(old_units, 0) - COALESCE(new_units, 0);

  IF projected_remaining < 0 THEN
    RAISE EXCEPTION 'Insufficient leave balance. Remaining: %, Requested impact: %.',
      ROUND(COALESCE(bal.days_remaining, 0), 2),
      ROUND(COALESCE(new_units, 0), 2)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_leave_balance ON public.leave_requests;
CREATE TRIGGER trg_check_leave_balance
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_leave_balance();

-- Rebase preview RPC to shared balance row + explicit unlimited handling.
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
  v_policy_version_id uuid;
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

  v_policy_version_id := public.leave_get_active_policy_version(_start_date);

  IF v_policy_version_id IS NOT NULL THEN
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
    WHERE r.policy_version_id = v_policy_version_id
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
  FROM public.leave_compute_employee_balance_row(effective_employee_id, _leave_type_id, _start_date);

  IF COALESCE(bal.is_unlimited, false) = false
     AND COALESCE(v_allow_negative, false) = false
     AND COALESCE(bal.days_remaining, 0) < requested_units THEN
    hard_errors := hard_errors || jsonb_build_array(
      format(
        'Insufficient balance. Available: %s, requested: %s.',
        COALESCE(bal.days_remaining, 0),
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
    'policy_version_id', v_policy_version_id,
    'rule_unit', v_unit,
    'requires_document', v_requires_document,
    'allow_negative_balance', v_allow_negative,
    'max_consecutive_days', v_max_consecutive,
    'min_notice_days', v_min_notice,
    'is_unlimited', COALESCE(bal.is_unlimited, false),
    'entitled_balance', COALESCE(bal.entitled_days, 0),
    'consumed_balance', COALESCE(bal.days_used, 0),
    'pending_balance', COALESCE(bal.days_pending, 0),
    'available_balance', COALESCE(bal.days_remaining, 0),
    'balance_source', COALESCE(bal.source, 'proration_adjustment_v1'),
    'hard_errors', hard_errors,
    'soft_warnings', soft_warnings,
    'reason', _reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_preview_request(uuid, uuid, date, date, numeric, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_preview_request(uuid, uuid, date, date, numeric, text, uuid) TO authenticated, service_role;

COMMIT;
