-- =============================================================================
-- Leave SLA Escalation Writer
-- =============================================================================
-- Adds a policy-admin operational RPC to:
-- 1) scan pending leave approvals against leave_service_levels target_hours
-- 2) write deduplicated escalation decision records to leave_request_decisions
-- 3) support dry-run mode for safe diagnostics
-- =============================================================================

CREATE OR REPLACE FUNCTION public.leave_run_sla_escalation(
  _as_of timestamptz DEFAULT now(),
  _dry_run boolean DEFAULT true,
  _max_rows integer DEFAULT 200,
  _run_tag text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  requester_id uuid := public.request_user_id();
  clamped_max_rows integer := GREATEST(1, LEAST(COALESCE(_max_rows, 200), 1000));
  scanned_count integer := 0;
  breached_count integer := 0;
  inserted_count integer := 0;
  skipped_existing_count integer := 0;
  run_tag text := NULLIF(btrim(COALESCE(_run_tag, '')), '');
  candidate record;
  escalation_key text;
  has_existing boolean;
  records jsonb := '[]'::jsonb;
BEGIN
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_manage_leave_policy(requester_id) THEN
    RAISE EXCEPTION 'Only admin/hr/director can run leave SLA escalation.'
      USING ERRCODE = '42501';
  END IF;

  FOR candidate IN
    WITH request_scope AS (
      SELECT
        lr.id AS leave_request_id,
        lr.employee_id,
        lr.status,
        lr.created_at,
        lr.amended_at,
        lr.updated_at,
        lr.manager_approved_at,
        lr.gm_approved_at,
        lr.start_date,
        lr.approval_route_snapshot,
        COALESCE(lr.policy_version_id, public.leave_get_active_policy_version(lr.start_date)) AS effective_policy_version_id
      FROM public.leave_requests lr
      WHERE lr.status IN ('pending', 'manager_approved', 'gm_approved')
        AND lr.final_approved_at IS NULL
        AND lr.status NOT IN ('rejected', 'cancelled')
    ),
    request_routes AS (
      SELECT
        rs.*,
        CASE
          WHEN COALESCE(array_length(rs.normalized_route, 1), 0) > 0 THEN rs.normalized_route
          ELSE public.resolve_leave_request_workflow_snapshot(rs.employee_id)
        END AS effective_route
      FROM (
        SELECT
          rs.*,
          ARRAY(
            SELECT stage
            FROM unnest(ARRAY['manager', 'general_manager', 'director']) AS stage
            WHERE stage = ANY(COALESCE(rs.approval_route_snapshot, ARRAY[]::text[]))
          ) AS normalized_route
        FROM request_scope rs
      ) rs
    ),
    request_stages AS (
      SELECT
        rr.*,
        public.next_leave_stage_from_route(
          rr.effective_route,
          CASE rr.status
            WHEN 'pending' THEN NULL
            WHEN 'manager_approved' THEN 'manager'
            WHEN 'gm_approved' THEN 'general_manager'
            ELSE NULL
          END
        ) AS workflow_stage,
        CASE rr.status
          WHEN 'pending' THEN COALESCE(rr.amended_at, rr.created_at)
          WHEN 'manager_approved' THEN COALESCE(rr.manager_approved_at, rr.updated_at, rr.created_at)
          WHEN 'gm_approved' THEN COALESCE(rr.gm_approved_at, rr.updated_at, rr.created_at)
          ELSE rr.updated_at
        END AS stage_entered_at
      FROM request_routes rr
    ),
    request_policy AS (
      SELECT
        rs.*,
        pv.policy_set_id
      FROM request_stages rs
      LEFT JOIN public.leave_policy_versions pv
        ON pv.id = rs.effective_policy_version_id
    ),
    candidates AS (
      SELECT
        rp.leave_request_id,
        rp.status,
        rp.workflow_stage,
        rp.stage_entered_at,
        rp.policy_set_id,
        lsl.target_hours,
        lsl.escalation_to_stage,
        FLOOR(EXTRACT(EPOCH FROM (_as_of - rp.stage_entered_at)) / 3600)::integer AS elapsed_hours
      FROM request_policy rp
      JOIN public.leave_service_levels lsl
        ON lsl.policy_set_id = rp.policy_set_id
       AND lsl.workflow_stage = rp.workflow_stage
      WHERE rp.workflow_stage IN ('manager', 'general_manager', 'director')
        AND rp.stage_entered_at IS NOT NULL
        AND _as_of > rp.stage_entered_at
    )
    SELECT *
    FROM candidates
    WHERE elapsed_hours > target_hours
    ORDER BY elapsed_hours DESC, leave_request_id
    LIMIT clamped_max_rows
  LOOP
    scanned_count := scanned_count + 1;
    breached_count := breached_count + 1;

    escalation_key := format('%s:%s:%s', candidate.leave_request_id, candidate.workflow_stage, candidate.status);

    SELECT EXISTS (
      SELECT 1
      FROM public.leave_request_decisions d
      WHERE d.leave_request_id = candidate.leave_request_id
        AND d.action = 'override'
        AND COALESCE(d.metadata ->> 'decision_type', '') = 'sla_escalation'
        AND COALESCE(d.metadata ->> 'escalation_key', '') = escalation_key
    )
    INTO has_existing;

    IF has_existing THEN
      skipped_existing_count := skipped_existing_count + 1;
    ELSIF NOT _dry_run THEN
      INSERT INTO public.leave_request_decisions (
        leave_request_id,
        stage,
        action,
        decided_by,
        decided_at,
        decision_reason,
        comments,
        from_status,
        to_status,
        from_cancellation_status,
        to_cancellation_status,
        metadata
      )
      VALUES (
        candidate.leave_request_id,
        candidate.workflow_stage,
        'override',
        requester_id,
        _as_of,
        'SLA target breached',
        format(
          'SLA breached at %s hours (target %s hours).',
          candidate.elapsed_hours,
          candidate.target_hours
        ),
        candidate.status,
        candidate.status,
        NULL,
        NULL,
        jsonb_build_object(
          'decided_via', 'leave_run_sla_escalation',
          'decision_type', 'sla_escalation',
          'escalation_key', escalation_key,
          'run_tag', run_tag,
          'dry_run', false,
          'sla_as_of', _as_of,
          'workflow_stage', candidate.workflow_stage,
          'target_hours', candidate.target_hours,
          'elapsed_hours', candidate.elapsed_hours,
          'policy_set_id', candidate.policy_set_id,
          'escalation_to_stage', candidate.escalation_to_stage,
          'stage_entered_at', candidate.stage_entered_at
        )
      );

      inserted_count := inserted_count + 1;
    END IF;

    records := records || jsonb_build_array(
      jsonb_build_object(
        'leave_request_id', candidate.leave_request_id,
        'status', candidate.status,
        'workflow_stage', candidate.workflow_stage,
        'target_hours', candidate.target_hours,
        'elapsed_hours', candidate.elapsed_hours,
        'stage_entered_at', candidate.stage_entered_at,
        'policy_set_id', candidate.policy_set_id,
        'escalation_to_stage', candidate.escalation_to_stage,
        'already_escalated', has_existing,
        'inserted', (NOT has_existing AND NOT _dry_run)
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'run_at', _as_of,
    'run_tag', run_tag,
    'dry_run', _dry_run,
    'max_rows', clamped_max_rows,
    'scanned', scanned_count,
    'breached', breached_count,
    'inserted', inserted_count,
    'skipped_existing', skipped_existing_count,
    'records', records
  );
END;
$$;

REVOKE ALL ON FUNCTION public.leave_run_sla_escalation(timestamptz, boolean, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_run_sla_escalation(timestamptz, boolean, integer, text) TO authenticated, service_role;
