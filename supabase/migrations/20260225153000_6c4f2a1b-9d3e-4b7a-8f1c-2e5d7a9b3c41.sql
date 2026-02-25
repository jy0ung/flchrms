ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS email_leave_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_admin_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_system_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.notification_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.user_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  category text NOT NULL,
  event_type text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  body_text text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'discarded')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  leased_by text,
  sent_at timestamptz,
  failed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_delivery_queue_notification_channel
  ON public.notification_delivery_queue (notification_id, channel);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_queue_status_next_attempt
  ON public.notification_delivery_queue (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_queue_user_created
  ON public.notification_delivery_queue (user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_notification_delivery_queue_updated_at ON public.notification_delivery_queue;
CREATE TRIGGER update_notification_delivery_queue_updated_at
BEFORE UPDATE ON public.notification_delivery_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.notification_delivery_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_delivery_queue_service_role_all ON public.notification_delivery_queue;
CREATE POLICY notification_delivery_queue_service_role_all
ON public.notification_delivery_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.notification_delivery_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_delivery_queue TO service_role;

CREATE OR REPLACE FUNCTION public.notification_email_category_enabled(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE lower(coalesce(_category, 'system'))
    WHEN 'leave' THEN coalesce(p.email_leave_enabled, false)
    WHEN 'admin' THEN coalesce(p.email_admin_enabled, false)
    WHEN 'system' THEN coalesce(p.email_system_enabled, false)
    ELSE false
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.user_notification_preferences p
    ON p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.notification_email_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_email_category_enabled(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_notification_email_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_recipient_email text;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notification_email_category_enabled(NEW.user_id, NEW.category) THEN
    RETURN NEW;
  END IF;

  SELECT nullif(btrim(u.email), '')
  INTO v_recipient_email
  FROM auth.users u
  WHERE u.id = NEW.user_id;

  IF v_recipient_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_delivery_queue (
    notification_id,
    user_id,
    channel,
    category,
    event_type,
    recipient_email,
    subject,
    body_text,
    payload,
    status,
    next_attempt_at
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    'email',
    NEW.category,
    NEW.event_type,
    v_recipient_email,
    NEW.title,
    NEW.message,
    jsonb_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'category', NEW.category,
      'event_type', NEW.event_type,
      'source_table', NEW.source_table,
      'source_id', NEW.source_id,
      'leave_request_id', NEW.leave_request_id,
      'metadata', coalesce(NEW.metadata, '{}'::jsonb)
    ),
    'pending',
    now()
  )
  ON CONFLICT (notification_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification_email_delivery() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_notification_email_delivery() TO service_role;

DROP TRIGGER IF EXISTS zz_after_insert_user_notifications_enqueue_email ON public.user_notifications;
CREATE TRIGGER zz_after_insert_user_notifications_enqueue_email
AFTER INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_notification_email_delivery();

CREATE OR REPLACE FUNCTION public.run_notification_retention_job(
  _read_notifications_days integer DEFAULT 180,
  _sent_queue_days integer DEFAULT 30,
  _failed_queue_days integer DEFAULT 90
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_read_days integer := coalesce(_read_notifications_days, 180);
  v_sent_days integer := coalesce(_sent_queue_days, 30);
  v_failed_days integer := coalesce(_failed_queue_days, 90);
  v_deleted_read_notifications integer := 0;
  v_deleted_sent_queue integer := 0;
  v_deleted_failed_queue integer := 0;
BEGIN
  IF v_read_days < 1 OR v_read_days > 3650 THEN
    RAISE EXCEPTION 'Read notification retention must be between 1 and 3650 days.';
  END IF;
  IF v_sent_days < 1 OR v_sent_days > 3650 THEN
    RAISE EXCEPTION 'Sent queue retention must be between 1 and 3650 days.';
  END IF;
  IF v_failed_days < 1 OR v_failed_days > 3650 THEN
    RAISE EXCEPTION 'Failed queue retention must be between 1 and 3650 days.';
  END IF;

  DELETE FROM public.user_notifications n
  WHERE n.read_at IS NOT NULL
    AND n.created_at < now() - make_interval(days => v_read_days);
  GET DIAGNOSTICS v_deleted_read_notifications = ROW_COUNT;

  DELETE FROM public.notification_delivery_queue q
  WHERE q.status IN ('sent', 'discarded')
    AND coalesce(q.sent_at, q.updated_at, q.created_at) < now() - make_interval(days => v_sent_days);
  GET DIAGNOSTICS v_deleted_sent_queue = ROW_COUNT;

  DELETE FROM public.notification_delivery_queue q
  WHERE q.status = 'failed'
    AND coalesce(q.failed_at, q.updated_at, q.created_at) < now() - make_interval(days => v_failed_days);
  GET DIAGNOSTICS v_deleted_failed_queue = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_read_notifications', v_deleted_read_notifications,
    'deleted_sent_queue', v_deleted_sent_queue,
    'deleted_failed_queue', v_deleted_failed_queue,
    'read_notifications_days', v_read_days,
    'sent_queue_days', v_sent_days,
    'failed_queue_days', v_failed_days,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_notification_retention_job(integer, integer, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.run_notification_retention_job(integer, integer, integer) TO service_role;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
     AND EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'cron' AND p.proname = 'schedule'
     )
  THEN
    BEGIN
      SELECT j.jobid INTO v_job_id
      FROM cron.job j
      WHERE j.jobname = 'notification-retention-daily'
      LIMIT 1;

      IF v_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_job_id);
      END IF;

      PERFORM cron.schedule(
        'notification-retention-daily',
        '17 3 * * *',
        'SELECT public.run_notification_retention_job();'
      );
    EXCEPTION
      WHEN undefined_table OR undefined_function OR invalid_schema_name THEN
        NULL;
    END;
  END IF;
END;
$$;

ANALYZE public.notification_delivery_queue;
