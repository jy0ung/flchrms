BEGIN;

DROP FUNCTION IF EXISTS public.leave_close_period(date, date, text);

CREATE OR REPLACE FUNCTION public.leave_close_period(
  _period_start date,
  _period_end date,
  _notes text DEFAULT NULL,
  _dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  snapshot_count integer := 0;
  planned_snapshot_count integer := 0;
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

  SELECT COUNT(*)
  INTO planned_snapshot_count
  FROM public.profiles p
  CROSS JOIN public.leave_types lt
  WHERE p.status <> 'terminated';

  IF NOT _dry_run THEN
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
        'notes', _notes,
        'dry_run', _dry_run
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
        'notes', _notes,
        'dry_run', _dry_run
      )
    )
    RETURNING id INTO export_id;
  END IF;

  RETURN jsonb_build_object(
    'period_start', _period_start,
    'period_end', _period_end,
    'dry_run', _dry_run,
    'planned_snapshot_rows', planned_snapshot_count,
    'snapshot_rows', CASE WHEN _dry_run THEN planned_snapshot_count ELSE snapshot_count END,
    'payroll_export_id', export_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_close_period(date, date, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_close_period(date, date, text, boolean) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.leave_export_payroll_inputs(date, date);

CREATE OR REPLACE FUNCTION public.leave_export_payroll_inputs(
  _period_start date,
  _period_end date,
  _dry_run boolean DEFAULT true
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

  IF NOT _dry_run THEN
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
        'generated_at', now(),
        'dry_run', _dry_run
      )
    )
    RETURNING id INTO export_id;
  END IF;

  RETURN jsonb_build_object(
    'export_id', export_id,
    'period_start', _period_start,
    'period_end', _period_end,
    'dry_run', _dry_run,
    'employees', jsonb_array_length(export_payload),
    'payload', export_payload
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_export_payroll_inputs(date, date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_export_payroll_inputs(date, date, boolean) TO authenticated, service_role;

COMMIT;
