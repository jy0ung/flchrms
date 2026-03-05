-- =============================================================================
-- Leave Core Phase 1 Hotfix
-- =============================================================================
-- Fixes runtime 42702 ambiguity in PL/pgSQL where local variable names matched
-- column names (`policy_version_id`) inside SQL statements.
-- =============================================================================

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
    'policy_version_id', v_policy_version_id,
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
  v_policy_version_id uuid;
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

  v_policy_version_id := public.leave_get_active_policy_version(_as_of);
  IF v_policy_version_id IS NULL THEN
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
      WHERE r.policy_version_id = v_policy_version_id
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
        v_policy_version_id,
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
    'policy_version_id', v_policy_version_id,
    'dry_run', _dry_run,
    'planned_entries', planned_count,
    'posted_entries', posted_count,
    'skipped_entries', skipped_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_run_accrual_cycle(date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_run_accrual_cycle(date, uuid, boolean) TO authenticated, service_role;

