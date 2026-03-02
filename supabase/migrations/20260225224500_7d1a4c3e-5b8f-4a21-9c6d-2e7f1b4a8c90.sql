-- Phase 9 follow-up: fix aggregate FILTER placement in worker telemetry summary RPC

CREATE OR REPLACE FUNCTION public.notification_admin_email_worker_run_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_window_start timestamptz := now() - interval '24 hours';
  v_summary jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification worker telemetry.';
  END IF;

  SELECT jsonb_build_object(
    'running_count', count(*) FILTER (WHERE run_status = 'running'),
    'completed_24h_count', count(*) FILTER (WHERE run_status = 'completed' AND started_at >= v_window_start),
    'failed_24h_count', count(*) FILTER (WHERE run_status = 'failed' AND started_at >= v_window_start),
    'claimed_24h_count', coalesce(sum(claimed_count) FILTER (WHERE started_at >= v_window_start), 0),
    'processed_24h_count', coalesce(sum(processed_count) FILTER (WHERE started_at >= v_window_start), 0),
    'sent_24h_count', coalesce(sum(sent_count) FILTER (WHERE started_at >= v_window_start), 0),
    'failed_items_24h_count', coalesce(sum(failed_count) FILTER (WHERE started_at >= v_window_start), 0),
    'discarded_24h_count', coalesce(sum(discarded_count) FILTER (WHERE started_at >= v_window_start), 0),
    'avg_duration_ms_24h',
      round(
        (avg(duration_ms) FILTER (WHERE finished_at IS NOT NULL AND started_at >= v_window_start))::numeric,
        2
      ),
    'latest_started_at', max(started_at),
    'latest_completed_at', max(finished_at) FILTER (WHERE run_status = 'completed'),
    'latest_failed_at', max(finished_at) FILTER (WHERE run_status = 'failed'),
    'generated_at', now()
  )
  INTO v_summary
  FROM public.notification_email_worker_runs;

  RETURN coalesce(v_summary, '{}'::jsonb);
END;
$$;
