-- =============================================================================
-- Leave Core Phase 1 Hotfix 3
-- =============================================================================
-- Fixes runtime ambiguity in leave_run_accrual_cycle:
--   column reference "source_ref" is ambiguous
-- =============================================================================

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
  v_source_ref text;
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
      v_source_ref := format('monthly:%s:%s', to_char(_as_of, 'YYYY-MM'), rule_row.leave_type_id::text);

      IF EXISTS (
        SELECT 1
        FROM public.leave_accrual_ledger l
        WHERE l.employee_id = profile_row.id
          AND l.leave_type_id = rule_row.leave_type_id
          AND l.source = 'accrual_cycle'
          AND l.source_ref = v_source_ref
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
        v_source_ref,
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
