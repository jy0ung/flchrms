CREATE OR REPLACE FUNCTION public.notification_worker_claim_email_queue(
  _batch_size integer DEFAULT 20,
  _worker_id text DEFAULT NULL,
  _lease_seconds integer DEFAULT 300,
  _max_attempts integer DEFAULT 10
)
RETURNS SETOF public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_batch_size integer := least(greatest(coalesce(_batch_size, 20), 1), 100);
  v_lease_seconds integer := least(greatest(coalesce(_lease_seconds, 300), 30), 3600);
  v_max_attempts integer := least(greatest(coalesce(_max_attempts, 10), 1), 100);
  v_worker_id text := coalesce(nullif(btrim(_worker_id), ''), 'notification-email-worker');
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT q.id
    FROM public.notification_delivery_queue q
    WHERE q.channel = 'email'
      AND q.attempts < v_max_attempts
      AND (
        (
          q.status IN ('pending', 'failed')
          AND q.next_attempt_at <= now()
        )
        OR (
          q.status = 'processing'
          AND q.leased_at IS NOT NULL
          AND q.leased_at <= now() - make_interval(secs => v_lease_seconds)
        )
      )
    ORDER BY q.next_attempt_at ASC, q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT v_batch_size
  )
  UPDATE public.notification_delivery_queue q
  SET status = 'processing',
      leased_at = now(),
      leased_by = v_worker_id,
      attempts = q.attempts + 1,
      updated_at = now()
  FROM candidates c
  WHERE q.id = c.id
  RETURNING q.*;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_claim_email_queue(integer, text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_claim_email_queue(integer, text, integer, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.notification_worker_finalize_email_queue_item(
  _queue_id uuid,
  _outcome text,
  _worker_id text DEFAULT NULL,
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
        leased_at = NULL,
        leased_by = NULL,
        updated_at = now()
    WHERE q.id = _queue_id
    RETURNING q.* INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_worker_finalize_email_queue_item(uuid, text, text, text, integer)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_worker_finalize_email_queue_item(uuid, text, text, text, integer)
  TO service_role;
