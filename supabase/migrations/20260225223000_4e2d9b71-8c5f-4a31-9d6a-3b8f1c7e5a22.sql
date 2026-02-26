-- Phase 9: notification performance follow-up + worker observability telemetry

-- Speed up common user notification list/history queries as volume grows.
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_category_created
  ON public.user_notifications (user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread_created
  ON public.user_notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Track notification email worker runs for ops visibility and troubleshooting.
CREATE TABLE IF NOT EXISTS public.notification_email_worker_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id text NOT NULL,
  provider text NOT NULL,
  run_status text NOT NULL DEFAULT 'running'
    CHECK (run_status IN ('running', 'completed', 'failed')),
  request_batch_size integer NOT NULL DEFAULT 25 CHECK (request_batch_size >= 1),
  request_lease_seconds integer NOT NULL DEFAULT 300 CHECK (request_lease_seconds >= 1),
  request_retry_delay_seconds integer NOT NULL DEFAULT 300 CHECK (request_retry_delay_seconds >= 0),
  request_max_attempts integer NOT NULL DEFAULT 5 CHECK (request_max_attempts >= 1),
  claimed_count integer NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  processed_count integer NOT NULL DEFAULT 0 CHECK (processed_count >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  discarded_count integer NOT NULL DEFAULT 0 CHECK (discarded_count >= 0),
  duration_ms integer NULL CHECK (duration_ms IS NULL OR duration_ms >= 0),
  error_message text NULL,
  request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_email_worker_runs_started_at
  ON public.notification_email_worker_runs (started_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_email_worker_runs_status_started_at
  ON public.notification_email_worker_runs (run_status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_email_worker_runs_provider_started_at
  ON public.notification_email_worker_runs (provider, started_at DESC);

DROP TRIGGER IF EXISTS update_notification_email_worker_runs_updated_at ON public.notification_email_worker_runs;
CREATE TRIGGER update_notification_email_worker_runs_updated_at
BEFORE UPDATE ON public.notification_email_worker_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_email_worker_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_email_worker_runs_select_privileged ON public.notification_email_worker_runs;
CREATE POLICY notification_email_worker_runs_select_privileged
ON public.notification_email_worker_runs
FOR SELECT
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

REVOKE ALL ON public.notification_email_worker_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notification_email_worker_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_email_worker_runs TO service_role;

CREATE OR REPLACE FUNCTION public.notification_worker_start_email_run(
  _worker_id text,
  _provider text,
  _batch_size integer DEFAULT 25,
  _lease_seconds integer DEFAULT 300,
  _retry_delay_seconds integer DEFAULT 300,
  _max_attempts integer DEFAULT 5,
  _request_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_run_id uuid;
  v_worker_id text := nullif(btrim(_worker_id), '');
  v_provider text := nullif(btrim(_provider), '');
BEGIN
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'worker_id is required';
  END IF;
  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'provider is required';
  END IF;

  INSERT INTO public.notification_email_worker_runs (
    worker_id,
    provider,
    run_status,
    request_batch_size,
    request_lease_seconds,
    request_retry_delay_seconds,
    request_max_attempts,
    request_payload
  )
  VALUES (
    v_worker_id,
    v_provider,
    'running',
    least(greatest(coalesce(_batch_size, 25), 1), 1000),
    least(greatest(coalesce(_lease_seconds, 300), 1), 86400),
    least(greatest(coalesce(_retry_delay_seconds, 300), 0), 86400),
    least(greatest(coalesce(_max_attempts, 5), 1), 1000),
    coalesce(_request_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_worker_finish_email_run(
  _run_id uuid,
  _claimed_count integer DEFAULT 0,
  _processed_count integer DEFAULT 0,
  _sent_count integer DEFAULT 0,
  _failed_count integer DEFAULT 0,
  _discarded_count integer DEFAULT 0,
  _duration_ms integer DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS public.notification_email_worker_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_row public.notification_email_worker_runs%ROWTYPE;
  v_error text := nullif(btrim(_error), '');
BEGIN
  IF _run_id IS NULL THEN
    RAISE EXCEPTION 'run_id is required';
  END IF;

  UPDATE public.notification_email_worker_runs r
  SET run_status = CASE WHEN v_error IS NULL THEN 'completed' ELSE 'failed' END,
      claimed_count = greatest(coalesce(_claimed_count, 0), 0),
      processed_count = greatest(coalesce(_processed_count, 0), 0),
      sent_count = greatest(coalesce(_sent_count, 0), 0),
      failed_count = greatest(coalesce(_failed_count, 0), 0),
      discarded_count = greatest(coalesce(_discarded_count, 0), 0),
      duration_ms = CASE
        WHEN _duration_ms IS NULL THEN duration_ms
        ELSE greatest(_duration_ms, 0)
      END,
      error_message = v_error,
      finished_at = now(),
      updated_at = now()
  WHERE r.id = _run_id
  RETURNING r.* INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Worker run not found: %', _run_id;
  END IF;

  RETURN v_row;
END;
$$;

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
      round(avg(duration_ms)::numeric, 2) FILTER (WHERE finished_at IS NOT NULL AND started_at >= v_window_start),
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

CREATE OR REPLACE FUNCTION public.notification_admin_list_email_worker_runs(
  _status text DEFAULT 'all',
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.notification_email_worker_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_status text := lower(coalesce(nullif(btrim(_status), ''), 'all'));
  v_limit integer := least(greatest(coalesce(_limit, 20), 1), 200);
  v_offset integer := greatest(coalesce(_offset, 0), 0);
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

  IF v_status NOT IN ('all', 'running', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid worker run status filter: %', v_status;
  END IF;

  RETURN QUERY
  SELECT r.*
  FROM public.notification_email_worker_runs r
  WHERE v_status = 'all' OR r.run_status = v_status
  ORDER BY
    CASE r.run_status
      WHEN 'running' THEN 0
      WHEN 'failed' THEN 1
      WHEN 'completed' THEN 2
      ELSE 3
    END,
    r.started_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_start_email_run(text, text, integer, integer, integer, integer, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_worker_finish_email_run(uuid, integer, integer, integer, integer, integer, integer, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_email_worker_run_summary()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_list_email_worker_runs(text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.notification_worker_start_email_run(text, text, integer, integer, integer, integer, jsonb)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_finish_email_run(uuid, integer, integer, integer, integer, integer, integer, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_email_worker_run_summary()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_list_email_worker_runs(text, integer, integer)
  TO authenticated, service_role;

ANALYZE public.user_notifications;
ANALYZE public.notification_email_worker_runs;
