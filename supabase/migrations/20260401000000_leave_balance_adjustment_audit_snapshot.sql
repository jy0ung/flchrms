BEGIN;

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
  v_before_balance record;
  v_adjustment_days numeric := ROUND(_adjustment_days, 2);
  v_audit_metadata jsonb;
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

  SELECT *
  INTO v_before_balance
  FROM public.leave_compute_employee_balance_row(_employee_id, _leave_type_id, _effective_date);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unable to compute leave balance snapshot for this adjustment.'
      USING ERRCODE = 'P0002';
  END IF;

  v_audit_metadata := jsonb_build_object(
    'actor_id', requester_id,
    'captured_at', timezone('utc', now()),
    'previous_remaining_days',
      CASE
        WHEN COALESCE(v_before_balance.is_unlimited, false) THEN NULL
        ELSE COALESCE(v_before_balance.days_remaining, 0)
      END,
    'new_remaining_days',
      CASE
        WHEN COALESCE(v_before_balance.is_unlimited, false) THEN NULL
        ELSE COALESCE(v_before_balance.days_remaining, 0) + v_adjustment_days
      END,
    'previous_is_unlimited', COALESCE(v_before_balance.is_unlimited, false),
    'new_is_unlimited', COALESCE(v_before_balance.is_unlimited, false),
    'previous_manual_adjustment_days', COALESCE(v_before_balance.manual_adjustment_days, 0),
    'new_manual_adjustment_days', COALESCE(v_before_balance.manual_adjustment_days, 0) + v_adjustment_days
  );

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
    v_adjustment_days,
    _effective_date,
    trim(_reason),
    requester_id,
    COALESCE(_metadata, '{}'::jsonb) || jsonb_build_object('audit', v_audit_metadata)
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

DROP FUNCTION IF EXISTS public.get_leave_balance_adjustments(uuid, uuid, date, date);

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
  previous_balance_days numeric,
  new_balance_days numeric,
  previous_is_unlimited boolean,
  new_is_unlimited boolean,
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
    NULLIF(a.metadata #>> '{audit,previous_remaining_days}', '')::numeric AS previous_balance_days,
    NULLIF(a.metadata #>> '{audit,new_remaining_days}', '')::numeric AS new_balance_days,
    COALESCE((a.metadata #>> '{audit,previous_is_unlimited}')::boolean, false) AS previous_is_unlimited,
    COALESCE((a.metadata #>> '{audit,new_is_unlimited}')::boolean, false) AS new_is_unlimited,
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

COMMIT;
