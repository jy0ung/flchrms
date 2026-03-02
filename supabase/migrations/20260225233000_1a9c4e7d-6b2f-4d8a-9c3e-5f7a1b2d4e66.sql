ALTER TABLE public.notification_delivery_queue
  ADD COLUMN IF NOT EXISTS last_provider text;

CREATE INDEX IF NOT EXISTS idx_notification_delivery_queue_dead_letter_analytics
  ON public.notification_delivery_queue (status, failed_at DESC, event_type, last_provider)
  WHERE channel = 'email' AND status IN ('failed', 'discarded');

CREATE OR REPLACE FUNCTION public.notification_worker_finalize_email_queue_item_v2(
  _queue_id uuid,
  _outcome text,
  _worker_id text DEFAULT NULL,
  _provider text DEFAULT NULL,
  _error text DEFAULT NULL,
  _retry_delay_seconds integer DEFAULT 300
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_row public.notification_delivery_queue%ROWTYPE;
  v_outcome text := lower(coalesce(_outcome, ''));
  v_worker_id text := nullif(btrim(_worker_id), '');
  v_provider text := nullif(lower(btrim(_provider)), '');
  v_retry_delay_seconds integer := least(greatest(coalesce(_retry_delay_seconds, 300), 15), 86400);
BEGIN
  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
  END IF;

  IF v_outcome NOT IN ('sent', 'failed', 'discarded') THEN
    RAISE EXCEPTION 'Invalid outcome. Expected sent, failed, or discarded.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.notification_delivery_queue q
  WHERE q.id = _queue_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Queue item not found: %', _queue_id;
  END IF;

  IF v_row.channel <> 'email' THEN
    RAISE EXCEPTION 'Unsupported queue channel for this worker: %', v_row.channel;
  END IF;

  IF v_worker_id IS NOT NULL AND v_row.leased_by IS NOT NULL AND v_row.leased_by <> v_worker_id THEN
    RAISE EXCEPTION 'Queue item % is leased by another worker.', _queue_id;
  END IF;

  IF v_outcome = 'sent' THEN
    UPDATE public.notification_delivery_queue q
    SET status = 'sent',
        sent_at = now(),
        failed_at = NULL,
        last_error = NULL,
        last_provider = coalesce(v_provider, q.last_provider),
        leased_at = NULL,
        leased_by = NULL,
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;

  ELSIF v_outcome = 'failed' THEN
    UPDATE public.notification_delivery_queue q
    SET status = 'failed',
        failed_at = now(),
        last_error = nullif(btrim(_error), ''),
        last_provider = coalesce(v_provider, q.last_provider),
        leased_at = NULL,
        leased_by = NULL,
        next_attempt_at = now() + make_interval(secs => v_retry_delay_seconds),
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;

  ELSE
    UPDATE public.notification_delivery_queue q
    SET status = 'discarded',
        failed_at = coalesce(q.failed_at, now()),
        last_error = coalesce(nullif(btrim(_error), ''), q.last_error, 'discarded'),
        last_provider = coalesce(v_provider, q.last_provider),
        leased_at = NULL,
        leased_by = NULL,
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_finalize_email_queue_item_v2(uuid, text, text, text, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_finalize_email_queue_item_v2(uuid, text, text, text, text, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.notification_admin_email_dead_letter_analytics(
  _window_hours integer DEFAULT 24,
  _limit integer DEFAULT 8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_window_hours integer := least(greatest(coalesce(_window_hours, 24), 1), 24 * 30);
  v_limit integer := least(greatest(coalesce(_limit, 8), 1), 50);
  v_window_start timestamptz := now() - make_interval(hours => v_window_hours);
  v_result jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT (
    public.has_role(v_actor_id, 'hr'::public.app_role)
    OR public.has_role(v_actor_id, 'admin'::public.app_role)
    OR public.has_role(v_actor_id, 'director'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  WITH base AS (
    SELECT
      q.id,
      q.status,
      q.event_type,
      q.category,
      coalesce(nullif(lower(btrim(q.last_provider)), ''), 'unknown') AS provider,
      left(regexp_replace(coalesce(nullif(btrim(q.last_error), ''), '(no error captured)'), '\s+', ' ', 'g'), 240) AS error_fingerprint,
      q.attempts,
      q.next_attempt_at,
      coalesce(q.failed_at, q.updated_at, q.created_at) AS last_state_at
    FROM public.notification_delivery_queue q
    WHERE q.channel = 'email'
      AND q.status IN ('failed', 'discarded')
      AND coalesce(q.failed_at, q.updated_at, q.created_at) >= v_window_start
  ),
  provider_rollup AS (
    SELECT
      provider,
      count(*)::int AS count,
      count(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      count(*) FILTER (WHERE status = 'discarded')::int AS discarded_count,
      count(*) FILTER (WHERE status = 'failed' AND next_attempt_at <= now())::int AS retry_ready_failed_count
    FROM base
    GROUP BY provider
    ORDER BY count(*) DESC, provider ASC
    LIMIT v_limit
  ),
  event_rollup AS (
    SELECT
      event_type,
      count(*)::int AS count,
      count(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      count(*) FILTER (WHERE status = 'discarded')::int AS discarded_count
    FROM base
    GROUP BY event_type
    ORDER BY count(*) DESC, event_type ASC
    LIMIT v_limit
  ),
  provider_event_rollup AS (
    SELECT
      provider,
      event_type,
      count(*)::int AS count,
      count(*) FILTER (WHERE status = 'failed')::int AS failed_count,
      count(*) FILTER (WHERE status = 'discarded')::int AS discarded_count,
      count(*) FILTER (WHERE status = 'failed' AND next_attempt_at <= now())::int AS retry_ready_failed_count
    FROM base
    GROUP BY provider, event_type
    ORDER BY count(*) DESC, provider ASC, event_type ASC
    LIMIT v_limit
  ),
  top_errors AS (
    SELECT
      provider,
      event_type,
      error_fingerprint,
      count(*)::int AS count,
      max(attempts)::int AS max_attempts,
      max(last_state_at) AS latest_seen_at,
      count(*) FILTER (WHERE status = 'failed' AND next_attempt_at <= now())::int AS retry_ready_failed_count
    FROM base
    GROUP BY provider, event_type, error_fingerprint
    ORDER BY count(*) DESC, max(last_state_at) DESC, provider ASC, event_type ASC
    LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'window_hours', v_window_hours,
    'generated_at', now(),
    'window_start', v_window_start,
    'dead_letter_count', coalesce((SELECT count(*)::int FROM base), 0),
    'failed_count', coalesce((SELECT count(*)::int FROM base WHERE status = 'failed'), 0),
    'discarded_count', coalesce((SELECT count(*)::int FROM base WHERE status = 'discarded'), 0),
    'retry_ready_failed_count', coalesce((SELECT count(*)::int FROM base WHERE status = 'failed' AND next_attempt_at <= now()), 0),
    'providers', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'provider', provider,
          'count', count,
          'failed_count', failed_count,
          'discarded_count', discarded_count,
          'retry_ready_failed_count', retry_ready_failed_count
        )
      )
      FROM provider_rollup
    ), '[]'::jsonb),
    'event_types', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'event_type', event_type,
          'count', count,
          'failed_count', failed_count,
          'discarded_count', discarded_count
        )
      )
      FROM event_rollup
    ), '[]'::jsonb),
    'provider_event_types', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'provider', provider,
          'event_type', event_type,
          'count', count,
          'failed_count', failed_count,
          'discarded_count', discarded_count,
          'retry_ready_failed_count', retry_ready_failed_count
        )
      )
      FROM provider_event_rollup
    ), '[]'::jsonb),
    'top_errors', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'provider', provider,
          'event_type', event_type,
          'error_fingerprint', error_fingerprint,
          'count', count,
          'max_attempts', max_attempts,
          'latest_seen_at', latest_seen_at,
          'retry_ready_failed_count', retry_ready_failed_count
        )
      )
      FROM top_errors
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_admin_email_dead_letter_analytics(integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_email_dead_letter_analytics(integer, integer)
  TO authenticated, service_role;

ANALYZE public.notification_delivery_queue;
