CREATE OR REPLACE FUNCTION public.notification_admin_email_queue_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_pending_count integer := 0;
  v_processing_count integer := 0;
  v_failed_count integer := 0;
  v_sent_count integer := 0;
  v_discarded_count integer := 0;
  v_ready_to_retry_count integer := 0;
  v_oldest_pending_at timestamptz;
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

  SELECT
    count(*) FILTER (WHERE q.status = 'pending'),
    count(*) FILTER (WHERE q.status = 'processing'),
    count(*) FILTER (WHERE q.status = 'failed'),
    count(*) FILTER (WHERE q.status = 'sent'),
    count(*) FILTER (WHERE q.status = 'discarded'),
    count(*) FILTER (
      WHERE q.status = 'failed'
        AND q.next_attempt_at <= now()
    ),
    min(q.created_at) FILTER (WHERE q.status = 'pending')
  INTO
    v_pending_count,
    v_processing_count,
    v_failed_count,
    v_sent_count,
    v_discarded_count,
    v_ready_to_retry_count,
    v_oldest_pending_at
  FROM public.notification_delivery_queue q
  WHERE q.channel = 'email';

  RETURN jsonb_build_object(
    'pending_count', v_pending_count,
    'processing_count', v_processing_count,
    'failed_count', v_failed_count,
    'sent_count', v_sent_count,
    'discarded_count', v_discarded_count,
    'ready_to_retry_failed_count', v_ready_to_retry_count,
    'oldest_pending_at', v_oldest_pending_at,
    'generated_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_list_email_queue(
  _status text DEFAULT 'all',
  _limit integer DEFAULT 25,
  _offset integer DEFAULT 0
)
RETURNS SETOF public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_status text := lower(coalesce(nullif(btrim(_status), ''), 'all'));
  v_limit integer := least(greatest(coalesce(_limit, 25), 1), 200);
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
    RAISE EXCEPTION 'Insufficient privileges for notification queue operations.';
  END IF;

  IF v_status NOT IN ('all', 'pending', 'processing', 'failed', 'sent', 'discarded') THEN
    RAISE EXCEPTION 'Invalid queue status filter: %', v_status;
  END IF;

  RETURN QUERY
  SELECT q.*
  FROM public.notification_delivery_queue q
  WHERE q.channel = 'email'
    AND (v_status = 'all' OR q.status = v_status)
  ORDER BY
    CASE q.status
      WHEN 'failed' THEN 0
      WHEN 'processing' THEN 1
      WHEN 'pending' THEN 2
      WHEN 'discarded' THEN 3
      WHEN 'sent' THEN 4
      ELSE 5
    END,
    q.next_attempt_at ASC,
    q.created_at DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_requeue_email_queue_item(
  _queue_id uuid,
  _delay_seconds integer DEFAULT 0
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_delay_seconds integer := least(greatest(coalesce(_delay_seconds, 0), 0), 86400);
  v_row public.notification_delivery_queue%ROWTYPE;
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

  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
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
    RAISE EXCEPTION 'Unsupported queue channel: %', v_row.channel;
  END IF;

  IF v_row.status = 'sent' THEN
    RAISE EXCEPTION 'Cannot requeue a sent notification.';
  END IF;

  UPDATE public.notification_delivery_queue q
  SET status = 'pending',
      attempts = 0,
      next_attempt_at = now() + make_interval(secs => v_delay_seconds),
      leased_at = NULL,
      leased_by = NULL,
      sent_at = NULL,
      failed_at = NULL,
      last_error = NULL,
      updated_at = now()
  WHERE q.id = _queue_id
  RETURNING q.* INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_admin_discard_email_queue_item(
  _queue_id uuid,
  _reason text DEFAULT NULL
)
RETURNS public.notification_delivery_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_row public.notification_delivery_queue%ROWTYPE;
  v_reason text := nullif(btrim(_reason), '');
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

  IF _queue_id IS NULL THEN
    RAISE EXCEPTION 'Queue ID is required.';
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
    RAISE EXCEPTION 'Unsupported queue channel: %', v_row.channel;
  END IF;

  IF v_row.status = 'sent' THEN
    RAISE EXCEPTION 'Cannot discard a sent notification.';
  END IF;

  UPDATE public.notification_delivery_queue q
  SET status = 'discarded',
      leased_at = NULL,
      leased_by = NULL,
      failed_at = coalesce(q.failed_at, now()),
      last_error = coalesce(v_reason, q.last_error, 'discarded by admin ops'),
      updated_at = now()
  WHERE q.id = _queue_id
  RETURNING q.* INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.notification_admin_email_queue_summary()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_list_email_queue(text, integer, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_requeue_email_queue_item(uuid, integer)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.notification_admin_discard_email_queue_item(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.notification_admin_email_queue_summary()
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_list_email_queue(text, integer, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_requeue_email_queue_item(uuid, integer)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_admin_discard_email_queue_item(uuid, text)
  TO authenticated, service_role;
