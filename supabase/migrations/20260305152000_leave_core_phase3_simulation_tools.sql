BEGIN;

-- ============================================================================
-- Enterprise Leave Core (Malaysia-first) - Phase 3 Simulation Tooling
-- ============================================================================
-- Slice 2 scope:
-- 1) Policy-change simulation (read-only, no operational writes).
-- 2) Accrual scenario simulation (read-only, no operational writes).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.leave_simulate_policy_change(
  _as_of date DEFAULT CURRENT_DATE,
  _horizon_months integer DEFAULT 6,
  _scope jsonb DEFAULT '{}'::jsonb,
  _policy_changes jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  active_policy_version_id uuid;
  scoped_employee_count integer := 0;
  row_calc record;
  month_index integer;
  baseline_opening numeric(12,2);
  baseline_closing numeric(12,2);
  simulated_opening numeric(12,2);
  simulated_closing numeric(12,2);
  baseline_accrual numeric(12,2);
  baseline_consumption numeric(12,2);
  simulated_accrual numeric(12,2);
  simulated_consumption numeric(12,2);
  accrual_multiplier numeric(12,4) := 1;
  consumption_multiplier numeric(12,4) := 1;
  carryover_cap_days numeric(12,2);
  baseline_days_by_month numeric[];
  simulated_days_by_month numeric[];
  baseline_amount_by_month numeric[];
  simulated_amount_by_month numeric[];
  monthly_delta jsonb := '[]'::jsonb;
  baseline_total_days numeric(14,2) := 0;
  simulated_total_days numeric(14,2) := 0;
  baseline_total_amount numeric(14,2) := 0;
  simulated_total_amount numeric(14,2) := 0;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can run leave policy simulations.'
      USING ERRCODE = '42501';
  END IF;

  IF _horizon_months IS NULL OR _horizon_months < 1 OR _horizon_months > 36 THEN
    RAISE EXCEPTION 'Simulation horizon must be between 1 and 36 months.'
      USING ERRCODE = '22023';
  END IF;

  IF _policy_changes ? 'accrual_multiplier'
     AND (_policy_changes ->> 'accrual_multiplier') !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RAISE EXCEPTION 'Invalid accrual multiplier.'
      USING ERRCODE = '22023';
  END IF;

  IF _policy_changes ? 'consumption_multiplier'
     AND (_policy_changes ->> 'consumption_multiplier') !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RAISE EXCEPTION 'Invalid consumption multiplier.'
      USING ERRCODE = '22023';
  END IF;

  IF _policy_changes ? 'carryover_cap_days'
     AND (_policy_changes ->> 'carryover_cap_days') !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RAISE EXCEPTION 'Invalid carryover cap value.'
      USING ERRCODE = '22023';
  END IF;

  accrual_multiplier := GREATEST(
    COALESCE((_policy_changes ->> 'accrual_multiplier')::numeric, 1),
    0
  );
  consumption_multiplier := GREATEST(
    COALESCE((_policy_changes ->> 'consumption_multiplier')::numeric, 1),
    0
  );
  carryover_cap_days := NULLIF(_policy_changes ->> 'carryover_cap_days', '')::numeric;

  active_policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF active_policy_version_id IS NULL THEN
    RAISE EXCEPTION 'No active leave policy version found for %.', _as_of
      USING ERRCODE = 'P0002';
  END IF;

  baseline_days_by_month := ARRAY_FILL(0::numeric, ARRAY[_horizon_months]);
  simulated_days_by_month := ARRAY_FILL(0::numeric, ARRAY[_horizon_months]);
  baseline_amount_by_month := ARRAY_FILL(0::numeric, ARRAY[_horizon_months]);
  simulated_amount_by_month := ARRAY_FILL(0::numeric, ARRAY[_horizon_months]);

  SELECT COUNT(*)
  INTO scoped_employee_count
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

  FOR row_calc IN
    WITH scoped_employees AS (
      SELECT p.id
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
      WHERE r.policy_version_id = active_policy_version_id
        AND r.is_enabled = true
    ),
    historical_consumption AS (
      SELECT
        lr.employee_id,
        lr.leave_type_id,
        COALESCE(ROUND(SUM(COALESCE(lr.requested_units, lr.days_count::numeric)) / 12.0, 2), 0) AS avg_monthly
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
      COALESCE(balance_row.available, 0)::numeric(12,2) AS current_balance,
      COALESCE(ROUND(COALESCE(lt.days_allowed, 0)::numeric / 12.0, 2), 0)::numeric(12,2) AS monthly_accrual,
      COALESCE(hc.avg_monthly, 0)::numeric(12,2) AS monthly_consumption,
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
    FOR month_index IN 1.._horizon_months LOOP
      baseline_accrual := row_calc.monthly_accrual;
      baseline_consumption := row_calc.monthly_consumption;
      simulated_accrual := ROUND((row_calc.monthly_accrual * accrual_multiplier)::numeric, 2);
      simulated_consumption := ROUND((row_calc.monthly_consumption * consumption_multiplier)::numeric, 2);

      baseline_opening := ROUND(
        (row_calc.current_balance + ((baseline_accrual - baseline_consumption) * (month_index - 1)))::numeric,
        2
      );
      simulated_opening := ROUND(
        (row_calc.current_balance + ((simulated_accrual - simulated_consumption) * (month_index - 1)))::numeric,
        2
      );

      baseline_closing := ROUND((baseline_opening + baseline_accrual - baseline_consumption)::numeric, 2);
      simulated_closing := ROUND((simulated_opening + simulated_accrual - simulated_consumption)::numeric, 2);

      IF carryover_cap_days IS NOT NULL THEN
        baseline_closing := LEAST(baseline_closing, carryover_cap_days);
        simulated_closing := LEAST(simulated_closing, carryover_cap_days);
      END IF;

      baseline_days_by_month[month_index] := baseline_days_by_month[month_index] + GREATEST(baseline_closing, 0);
      simulated_days_by_month[month_index] := simulated_days_by_month[month_index] + GREATEST(simulated_closing, 0);
      baseline_amount_by_month[month_index] := baseline_amount_by_month[month_index]
        + ROUND((GREATEST(baseline_closing, 0) * row_calc.daily_rate)::numeric, 2);
      simulated_amount_by_month[month_index] := simulated_amount_by_month[month_index]
        + ROUND((GREATEST(simulated_closing, 0) * row_calc.daily_rate)::numeric, 2);
    END LOOP;
  END LOOP;

  FOR month_index IN 1.._horizon_months LOOP
    baseline_total_days := baseline_total_days + baseline_days_by_month[month_index];
    simulated_total_days := simulated_total_days + simulated_days_by_month[month_index];
    baseline_total_amount := baseline_total_amount + baseline_amount_by_month[month_index];
    simulated_total_amount := simulated_total_amount + simulated_amount_by_month[month_index];

    monthly_delta := monthly_delta || jsonb_build_array(
      jsonb_build_object(
        'month_start',
        (date_trunc('month', _as_of)::date + make_interval(months => (month_index - 1)))::date,
        'baseline_days', ROUND(COALESCE(baseline_days_by_month[month_index], 0), 2),
        'simulated_days', ROUND(COALESCE(simulated_days_by_month[month_index], 0), 2),
        'delta_days', ROUND(COALESCE(simulated_days_by_month[month_index], 0) - COALESCE(baseline_days_by_month[month_index], 0), 2),
        'baseline_amount', ROUND(COALESCE(baseline_amount_by_month[month_index], 0), 2),
        'simulated_amount', ROUND(COALESCE(simulated_amount_by_month[month_index], 0), 2),
        'delta_amount', ROUND(COALESCE(simulated_amount_by_month[month_index], 0) - COALESCE(baseline_amount_by_month[month_index], 0), 2),
        'currency_code', 'MYR'
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'as_of', _as_of,
    'horizon_months', _horizon_months,
    'dry_run', true,
    'policy_version_id', active_policy_version_id,
    'employees', scoped_employee_count,
    'baseline_total_days', ROUND(baseline_total_days, 2),
    'simulated_total_days', ROUND(simulated_total_days, 2),
    'delta_total_days', ROUND(simulated_total_days - baseline_total_days, 2),
    'baseline_total_amount', ROUND(baseline_total_amount, 2),
    'simulated_total_amount', ROUND(simulated_total_amount, 2),
    'delta_total_amount', ROUND(simulated_total_amount - baseline_total_amount, 2),
    'currency_code', 'MYR',
    'assumptions', jsonb_build_object(
      'accrual_multiplier', accrual_multiplier,
      'consumption_multiplier', consumption_multiplier,
      'carryover_cap_days', carryover_cap_days
    ),
    'monthly_delta', monthly_delta,
    'scope', COALESCE(_scope, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_simulate_policy_change(date, integer, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_simulate_policy_change(date, integer, jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.leave_simulate_accrual_scenario(
  _as_of date DEFAULT CURRENT_DATE,
  _scope jsonb DEFAULT '{}'::jsonb,
  _scenario jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  active_policy_version_id uuid;
  scoped_employee_count integer := 0;
  scenario_months integer := 6;
  accrual_multiplier numeric(12,4) := 1;
  by_leave_type jsonb := '[]'::jsonb;
  baseline_total_units numeric(14,2) := 0;
  simulated_total_units numeric(14,2) := 0;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can run accrual scenario simulations.'
      USING ERRCODE = '42501';
  END IF;

  IF _scenario ? 'months' AND (_scenario ->> 'months') !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid scenario months value.'
      USING ERRCODE = '22023';
  END IF;

  IF _scenario ? 'accrual_multiplier'
     AND (_scenario ->> 'accrual_multiplier') !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    RAISE EXCEPTION 'Invalid accrual multiplier.'
      USING ERRCODE = '22023';
  END IF;

  scenario_months := COALESCE((_scenario ->> 'months')::integer, 6);
  IF scenario_months < 1 OR scenario_months > 36 THEN
    RAISE EXCEPTION 'Scenario months must be between 1 and 36.'
      USING ERRCODE = '22023';
  END IF;

  accrual_multiplier := GREATEST(COALESCE((_scenario ->> 'accrual_multiplier')::numeric, 1), 0);

  active_policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF active_policy_version_id IS NULL THEN
    RAISE EXCEPTION 'No active leave policy version found for %.', _as_of
      USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*)
  INTO scoped_employee_count
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

  WITH scoped_employees AS (
    SELECT p.id
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
  scoped_leave_types AS (
    SELECT DISTINCT r.leave_type_id
    FROM public.leave_type_rules r
    WHERE r.policy_version_id = active_policy_version_id
      AND r.is_enabled = true
      AND (
        COALESCE(jsonb_typeof(_scenario -> 'leave_type_ids') <> 'array', true)
        OR r.leave_type_id IN (
          SELECT v.value::uuid
          FROM jsonb_array_elements_text(_scenario -> 'leave_type_ids') AS v(value)
          WHERE v.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
      )
  ),
  by_type AS (
    SELECT
      lt.id AS leave_type_id,
      lt.name AS leave_type_name,
      COUNT(se.id)::integer AS employee_count,
      ROUND(
        SUM(COALESCE(lt.days_allowed, 0)::numeric / 12.0 * scenario_months),
        2
      ) AS baseline_units,
      ROUND(
        SUM(COALESCE(lt.days_allowed, 0)::numeric / 12.0 * scenario_months * accrual_multiplier),
        2
      ) AS simulated_units
    FROM scoped_leave_types slt
    JOIN public.leave_types lt ON lt.id = slt.leave_type_id
    CROSS JOIN scoped_employees se
    GROUP BY lt.id, lt.name
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'leave_type_id', bt.leave_type_id,
          'leave_type_name', bt.leave_type_name,
          'employee_count', bt.employee_count,
          'baseline_units', bt.baseline_units,
          'simulated_units', bt.simulated_units,
          'delta_units', ROUND(bt.simulated_units - bt.baseline_units, 2)
        )
        ORDER BY bt.leave_type_name
      ),
      '[]'::jsonb
    ),
    COALESCE(SUM(bt.baseline_units), 0),
    COALESCE(SUM(bt.simulated_units), 0)
  INTO by_leave_type, baseline_total_units, simulated_total_units
  FROM by_type bt;

  RETURN jsonb_build_object(
    'as_of', _as_of,
    'dry_run', true,
    'policy_version_id', active_policy_version_id,
    'employees', scoped_employee_count,
    'scenario', jsonb_build_object(
      'months', scenario_months,
      'accrual_multiplier', accrual_multiplier
    ),
    'baseline_total_units', ROUND(baseline_total_units, 2),
    'simulated_total_units', ROUND(simulated_total_units, 2),
    'delta_total_units', ROUND(simulated_total_units - baseline_total_units, 2),
    'by_leave_type', by_leave_type,
    'scope', COALESCE(_scope, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_simulate_accrual_scenario(date, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_simulate_accrual_scenario(date, jsonb, jsonb) TO authenticated, service_role;

COMMIT;
