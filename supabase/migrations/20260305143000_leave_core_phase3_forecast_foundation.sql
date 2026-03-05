BEGIN;

-- ============================================================================
-- Enterprise Leave Core (Malaysia-first) - Phase 3 Forecast Foundations
-- ============================================================================
-- Slice 1 scope:
-- 1) Liability snapshot persistence for deterministic period evidence.
-- 2) Forecast run + row persistence for audit-safe projections.
-- 3) Read-only/dry-run capable RPCs:
--    - leave_generate_liability_snapshot
--    - leave_run_forecast
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_estimate_daily_rate(
  _employee_id uuid,
  _as_of date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT COALESCE(
    (
      SELECT ROUND(
        (
          COALESCE(ss.basic_salary, 0)
          + COALESCE(ss.housing_allowance, 0)
          + COALESCE(ss.transport_allowance, 0)
          + COALESCE(ss.meal_allowance, 0)
          + COALESCE(ss.other_allowances, 0)
        ) / 22.0,
        2
      )
      FROM public.salary_structures ss
      WHERE ss.employee_id = _employee_id
        AND (
          (ss.is_active IS TRUE AND ss.effective_date <= _as_of)
          OR ss.effective_date <= _as_of
        )
      ORDER BY
        (CASE WHEN ss.is_active IS TRUE THEN 0 ELSE 1 END),
        ss.effective_date DESC,
        ss.updated_at DESC
      LIMIT 1
    ),
    0::numeric
  );
$$;

REVOKE ALL ON FUNCTION public.leave_estimate_daily_rate(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_estimate_daily_rate(uuid, date) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.leave_liability_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  policy_version_id uuid REFERENCES public.leave_policy_versions(id) ON DELETE SET NULL,
  balance_days numeric(12,2) NOT NULL,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  estimated_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'MYR',
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_tag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, employee_id, leave_type_id)
);

CREATE TABLE IF NOT EXISTS public.leave_forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  as_of_date date NOT NULL,
  horizon_months integer NOT NULL CHECK (horizon_months >= 1 AND horizon_months <= 36),
  policy_version_id uuid REFERENCES public.leave_policy_versions(id) ON DELETE SET NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'failed')),
  total_employees integer NOT NULL DEFAULT 0,
  generated_rows integer NOT NULL DEFAULT 0,
  total_projected_days numeric(14,2) NOT NULL DEFAULT 0,
  total_projected_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'MYR',
  run_tag text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_forecast_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_run_id uuid NOT NULL REFERENCES public.leave_forecast_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  opening_balance numeric(12,2) NOT NULL,
  projected_accrual numeric(12,2) NOT NULL DEFAULT 0,
  projected_consumption numeric(12,2) NOT NULL DEFAULT 0,
  projected_closing_balance numeric(12,2) NOT NULL,
  projected_liability numeric(12,2) NOT NULL DEFAULT 0,
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'MYR',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (forecast_run_id, employee_id, leave_type_id, month_start)
);

DROP TRIGGER IF EXISTS update_leave_forecast_runs_updated_at ON public.leave_forecast_runs;
CREATE TRIGGER update_leave_forecast_runs_updated_at
BEFORE UPDATE ON public.leave_forecast_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_leave_liability_snapshots_snapshot_date
  ON public.leave_liability_snapshots (snapshot_date DESC, employee_id, leave_type_id);

CREATE INDEX IF NOT EXISTS idx_leave_liability_snapshots_employee
  ON public.leave_liability_snapshots (employee_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_leave_forecast_runs_as_of_date
  ON public.leave_forecast_runs (as_of_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_forecast_rows_run_month
  ON public.leave_forecast_rows (forecast_run_id, month_start);

CREATE INDEX IF NOT EXISTS idx_leave_forecast_rows_employee
  ON public.leave_forecast_rows (employee_id, month_start DESC);

ALTER TABLE public.leave_liability_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_forecast_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_liability_snapshots_select_policy_admin ON public.leave_liability_snapshots;
CREATE POLICY leave_liability_snapshots_select_policy_admin
ON public.leave_liability_snapshots
FOR SELECT
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_liability_snapshots_manage_policy_admin ON public.leave_liability_snapshots;
CREATE POLICY leave_liability_snapshots_manage_policy_admin
ON public.leave_liability_snapshots
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_forecast_runs_select_policy_admin ON public.leave_forecast_runs;
CREATE POLICY leave_forecast_runs_select_policy_admin
ON public.leave_forecast_runs
FOR SELECT
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_forecast_runs_manage_policy_admin ON public.leave_forecast_runs;
CREATE POLICY leave_forecast_runs_manage_policy_admin
ON public.leave_forecast_runs
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_forecast_rows_select_policy_admin ON public.leave_forecast_rows;
CREATE POLICY leave_forecast_rows_select_policy_admin
ON public.leave_forecast_rows
FOR SELECT
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()));

DROP POLICY IF EXISTS leave_forecast_rows_manage_policy_admin ON public.leave_forecast_rows;
CREATE POLICY leave_forecast_rows_manage_policy_admin
ON public.leave_forecast_rows
FOR ALL
TO authenticated
USING (public.can_manage_leave_policy(public.request_user_id()))
WITH CHECK (public.can_manage_leave_policy(public.request_user_id()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_liability_snapshots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_forecast_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_forecast_rows TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_generate_liability_snapshot(
  _as_of date DEFAULT CURRENT_DATE,
  _scope jsonb DEFAULT '{}'::jsonb,
  _dry_run boolean DEFAULT true,
  _run_tag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  policy_version_id uuid;
  row_calc record;
  planned_rows integer := 0;
  written_rows integer := 0;
  total_days numeric(14,2) := 0;
  total_amount numeric(14,2) := 0;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can generate leave liability snapshots.'
      USING ERRCODE = '42501';
  END IF;

  policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF policy_version_id IS NULL THEN
    RAISE EXCEPTION 'No active leave policy version found for %.', _as_of
      USING ERRCODE = 'P0002';
  END IF;

  FOR row_calc IN
    WITH scoped_employees AS (
      SELECT p.id, p.department_id
      FROM public.profiles p
      WHERE p.status <> 'terminated'
        AND (
          COALESCE(jsonb_typeof(_scope -> 'employee_ids') <> 'array', true)
          OR p.id IN (
            SELECT v.value::uuid
            FROM jsonb_array_elements_text(_scope -> 'employee_ids') AS v(value)
            WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          )
        )
        AND (
          COALESCE(jsonb_typeof(_scope -> 'department_ids') <> 'array', true)
          OR p.department_id IN (
            SELECT v.value::uuid
            FROM jsonb_array_elements_text(_scope -> 'department_ids') AS v(value)
            WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          )
        )
    ),
    enabled_leave_types AS (
      SELECT DISTINCT r.leave_type_id
      FROM public.leave_type_rules r
      WHERE r.policy_version_id = policy_version_id
        AND r.is_enabled = true
    )
    SELECT
      se.id AS employee_id,
      lt.leave_type_id,
      COALESCE(balance_row.available, 0)::numeric(12,2) AS available_days,
      GREATEST(COALESCE(balance_row.available, 0), 0)::numeric(12,2) AS positive_days,
      public.leave_estimate_daily_rate(se.id, _as_of)::numeric(12,2) AS daily_rate
    FROM scoped_employees se
    CROSS JOIN enabled_leave_types lt
    CROSS JOIN LATERAL public.leave_compute_balance_snapshot(se.id, lt.leave_type_id, _as_of) AS balance_row
    ORDER BY se.id, lt.leave_type_id
  LOOP
    planned_rows := planned_rows + 1;
    total_days := total_days + row_calc.positive_days;
    total_amount := total_amount + ROUND((row_calc.positive_days * row_calc.daily_rate)::numeric, 2);

    IF _dry_run THEN
      CONTINUE;
    END IF;

    INSERT INTO public.leave_liability_snapshots (
      snapshot_date,
      employee_id,
      leave_type_id,
      policy_version_id,
      balance_days,
      daily_rate,
      estimated_amount,
      currency_code,
      scope,
      run_tag,
      metadata,
      created_by
    )
    VALUES (
      _as_of,
      row_calc.employee_id,
      row_calc.leave_type_id,
      policy_version_id,
      row_calc.available_days,
      row_calc.daily_rate,
      ROUND((row_calc.positive_days * row_calc.daily_rate)::numeric, 2),
      'MYR',
      COALESCE(_scope, '{}'::jsonb),
      _run_tag,
      jsonb_build_object(
        'source', 'leave_generate_liability_snapshot',
        'dry_run', _dry_run
      ),
      requester_id
    )
    ON CONFLICT (snapshot_date, employee_id, leave_type_id)
    DO UPDATE SET
      policy_version_id = EXCLUDED.policy_version_id,
      balance_days = EXCLUDED.balance_days,
      daily_rate = EXCLUDED.daily_rate,
      estimated_amount = EXCLUDED.estimated_amount,
      currency_code = EXCLUDED.currency_code,
      scope = EXCLUDED.scope,
      run_tag = EXCLUDED.run_tag,
      metadata = EXCLUDED.metadata,
      created_by = EXCLUDED.created_by,
      created_at = now();

    written_rows := written_rows + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', _as_of,
    'policy_version_id', policy_version_id,
    'dry_run', _dry_run,
    'planned_rows', planned_rows,
    'written_rows', CASE WHEN _dry_run THEN planned_rows ELSE written_rows END,
    'total_days', ROUND(total_days, 2),
    'estimated_amount', ROUND(total_amount, 2),
    'currency_code', 'MYR',
    'scope', COALESCE(_scope, '{}'::jsonb),
    'run_tag', _run_tag
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_generate_liability_snapshot(date, jsonb, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_generate_liability_snapshot(date, jsonb, boolean, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_run_forecast(
  _as_of date DEFAULT CURRENT_DATE,
  _horizon_months integer DEFAULT 6,
  _scope jsonb DEFAULT '{}'::jsonb,
  _dry_run boolean DEFAULT true,
  _run_tag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  policy_version_id uuid;
  forecast_run_id uuid;
  base_row record;
  month_index integer;
  month_start date;
  opening_balance numeric(12,2);
  projected_accrual numeric(12,2);
  projected_consumption numeric(12,2);
  closing_balance numeric(12,2);
  projected_liability numeric(12,2);
  total_employees integer := 0;
  rows_planned integer := 0;
  rows_written integer := 0;
  total_projected_days numeric(14,2) := 0;
  total_projected_amount numeric(14,2) := 0;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can run leave forecasts.'
      USING ERRCODE = '42501';
  END IF;

  IF _horizon_months IS NULL OR _horizon_months < 1 OR _horizon_months > 36 THEN
    RAISE EXCEPTION 'Forecast horizon must be between 1 and 36 months.'
      USING ERRCODE = '22023';
  END IF;

  policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF policy_version_id IS NULL THEN
    RAISE EXCEPTION 'No active leave policy version found for %.', _as_of
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*)
  INTO total_employees
  FROM public.profiles p
  WHERE p.status <> 'terminated'
    AND (
      COALESCE(jsonb_typeof(_scope -> 'employee_ids') <> 'array', true)
      OR p.id IN (
        SELECT v.value::uuid
        FROM jsonb_array_elements_text(_scope -> 'employee_ids') AS v(value)
        WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    )
    AND (
      COALESCE(jsonb_typeof(_scope -> 'department_ids') <> 'array', true)
      OR p.department_id IN (
        SELECT v.value::uuid
        FROM jsonb_array_elements_text(_scope -> 'department_ids') AS v(value)
        WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      )
    );

  IF NOT _dry_run THEN
    INSERT INTO public.leave_forecast_runs (
      as_of_date,
      horizon_months,
      policy_version_id,
      scope,
      assumptions,
      status,
      run_tag,
      created_by,
      started_at
    )
    VALUES (
      _as_of,
      _horizon_months,
      policy_version_id,
      COALESCE(_scope, '{}'::jsonb),
      jsonb_build_object(
        'method', 'linear_accrual_with_lookback_consumption',
        'lookback_days', 365
      ),
      'planned',
      _run_tag,
      requester_id,
      now()
    )
    RETURNING id INTO forecast_run_id;
  END IF;

  FOR base_row IN
    WITH scoped_employees AS (
      SELECT p.id, p.department_id
      FROM public.profiles p
      WHERE p.status <> 'terminated'
        AND (
          COALESCE(jsonb_typeof(_scope -> 'employee_ids') <> 'array', true)
          OR p.id IN (
            SELECT v.value::uuid
            FROM jsonb_array_elements_text(_scope -> 'employee_ids') AS v(value)
            WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          )
        )
        AND (
          COALESCE(jsonb_typeof(_scope -> 'department_ids') <> 'array', true)
          OR p.department_id IN (
            SELECT v.value::uuid
            FROM jsonb_array_elements_text(_scope -> 'department_ids') AS v(value)
            WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          )
        )
    ),
    enabled_leave_types AS (
      SELECT DISTINCT r.leave_type_id
      FROM public.leave_type_rules r
      WHERE r.policy_version_id = policy_version_id
        AND r.is_enabled = true
    ),
    historical_consumption AS (
      SELECT
        lr.employee_id,
        lr.leave_type_id,
        COALESCE(
          ROUND(SUM(COALESCE(lr.requested_units, lr.days_count::numeric)) / 12.0, 2),
          0
        ) AS avg_monthly_consumption
      FROM public.leave_requests lr
      WHERE lr.status NOT IN ('rejected', 'cancelled')
        AND lr.final_approved_at IS NOT NULL
        AND lr.start_date >= (_as_of - INTERVAL '365 days')::date
        AND lr.start_date <= _as_of
      GROUP BY lr.employee_id, lr.leave_type_id
    )
    SELECT
      se.id AS employee_id,
      elt.leave_type_id,
      COALESCE(balance_row.available, 0)::numeric(12,2) AS base_available,
      COALESCE(ROUND(COALESCE(lt.days_allowed, 0)::numeric / 12.0, 2), 0)::numeric(12,2) AS monthly_accrual,
      COALESCE(hc.avg_monthly_consumption, 0)::numeric(12,2) AS monthly_consumption,
      public.leave_estimate_daily_rate(se.id, _as_of)::numeric(12,2) AS daily_rate
    FROM scoped_employees se
    CROSS JOIN enabled_leave_types elt
    JOIN public.leave_types lt ON lt.id = elt.leave_type_id
    CROSS JOIN LATERAL public.leave_compute_balance_snapshot(se.id, elt.leave_type_id, _as_of) AS balance_row
    LEFT JOIN historical_consumption hc
      ON hc.employee_id = se.id
     AND hc.leave_type_id = elt.leave_type_id
    ORDER BY se.id, elt.leave_type_id
  LOOP
    FOR month_index IN 0..(_horizon_months - 1) LOOP
      month_start := (date_trunc('month', _as_of)::date + make_interval(months => month_index))::date;

      opening_balance := ROUND(
        (
          base_row.base_available
          + ((base_row.monthly_accrual - base_row.monthly_consumption) * month_index)
        )::numeric,
        2
      );

      projected_accrual := base_row.monthly_accrual;
      projected_consumption := base_row.monthly_consumption;
      closing_balance := ROUND((opening_balance + projected_accrual - projected_consumption)::numeric, 2);
      projected_liability := ROUND((GREATEST(closing_balance, 0) * base_row.daily_rate)::numeric, 2);

      rows_planned := rows_planned + 1;
      total_projected_days := total_projected_days + GREATEST(closing_balance, 0);
      total_projected_amount := total_projected_amount + projected_liability;

      IF _dry_run THEN
        CONTINUE;
      END IF;

      INSERT INTO public.leave_forecast_rows (
        forecast_run_id,
        employee_id,
        leave_type_id,
        month_start,
        opening_balance,
        projected_accrual,
        projected_consumption,
        projected_closing_balance,
        projected_liability,
        daily_rate,
        currency_code,
        metadata
      )
      VALUES (
        forecast_run_id,
        base_row.employee_id,
        base_row.leave_type_id,
        month_start,
        opening_balance,
        projected_accrual,
        projected_consumption,
        closing_balance,
        projected_liability,
        base_row.daily_rate,
        'MYR',
        jsonb_build_object(
          'source', 'leave_run_forecast',
          'month_index', month_index
        )
      )
      ON CONFLICT (forecast_run_id, employee_id, leave_type_id, month_start)
      DO UPDATE SET
        opening_balance = EXCLUDED.opening_balance,
        projected_accrual = EXCLUDED.projected_accrual,
        projected_consumption = EXCLUDED.projected_consumption,
        projected_closing_balance = EXCLUDED.projected_closing_balance,
        projected_liability = EXCLUDED.projected_liability,
        daily_rate = EXCLUDED.daily_rate,
        currency_code = EXCLUDED.currency_code,
        metadata = EXCLUDED.metadata;

      rows_written := rows_written + 1;
    END LOOP;
  END LOOP;

  IF NOT _dry_run THEN
    UPDATE public.leave_forecast_runs
    SET
      status = 'completed',
      total_employees = total_employees,
      generated_rows = rows_written,
      total_projected_days = ROUND(total_projected_days, 2),
      total_projected_amount = ROUND(total_projected_amount, 2),
      completed_at = now(),
      updated_at = now()
    WHERE id = forecast_run_id;
  END IF;

  RETURN jsonb_build_object(
    'forecast_run_id', forecast_run_id,
    'as_of', _as_of,
    'horizon_months', _horizon_months,
    'policy_version_id', policy_version_id,
    'dry_run', _dry_run,
    'employees', total_employees,
    'planned_rows', rows_planned,
    'written_rows', CASE WHEN _dry_run THEN rows_planned ELSE rows_written END,
    'total_projected_days', ROUND(total_projected_days, 2),
    'total_projected_amount', ROUND(total_projected_amount, 2),
    'currency_code', 'MYR',
    'scope', COALESCE(_scope, '{}'::jsonb),
    'run_tag', _run_tag
  );
EXCEPTION
  WHEN OTHERS THEN
    IF forecast_run_id IS NOT NULL THEN
      UPDATE public.leave_forecast_runs
      SET
        status = 'failed',
        error_message = LEFT(SQLERRM, 1000),
        completed_at = now(),
        updated_at = now()
      WHERE id = forecast_run_id;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_run_forecast(date, integer, jsonb, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_run_forecast(date, integer, jsonb, boolean, text) TO authenticated, service_role;

COMMIT;
