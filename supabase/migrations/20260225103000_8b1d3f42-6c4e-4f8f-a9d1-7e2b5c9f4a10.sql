CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'system',
  event_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_table text,
  source_id uuid,
  leave_request_id uuid REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  leave_request_event_id uuid REFERENCES public.leave_request_events(id) ON DELETE CASCADE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_event_unique
  ON public.user_notifications (user_id, leave_request_event_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read_created
  ON public.user_notifications (user_id, read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_leave_request
  ON public.user_notifications (leave_request_id, created_at DESC);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
CREATE POLICY user_notifications_select_own
ON public.user_notifications
FOR SELECT
TO authenticated
USING (user_id = public.request_user_id());

REVOKE ALL ON public.user_notifications FROM anon;
GRANT SELECT ON public.user_notifications TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_user_notifications_read(_notification_ids uuid[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  UPDATE public.user_notifications n
  SET read_at = coalesce(n.read_at, now())
  WHERE n.user_id = v_user_id
    AND n.read_at IS NULL
    AND (
      _notification_ids IS NULL
      OR n.id = ANY (_notification_ids)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_user_notifications_read(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_read(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.next_leave_stage_from_route(
  _route text[],
  _current_stage text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'pg_catalog'
AS $$
DECLARE
  v_canonical constant text[] := ARRAY['manager', 'general_manager', 'director'];
  v_stage text;
  v_seen_current boolean := (_current_stage IS NULL);
BEGIN
  IF _route IS NULL OR coalesce(array_length(_route, 1), 0) = 0 THEN
    RETURN NULL;
  END IF;

  FOREACH v_stage IN ARRAY v_canonical LOOP
    IF NOT (v_stage = ANY (_route)) THEN
      CONTINUE;
    END IF;

    IF v_seen_current THEN
      RETURN v_stage;
    END IF;

    IF v_stage = _current_stage THEN
      v_seen_current := true;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_stage_recipients(
  _employee_id uuid,
  _stage text
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $$
  WITH emp AS (
    SELECT
      p.id,
      p.manager_id,
      mgr.manager_id AS gm_manager_id
    FROM public.profiles p
    LEFT JOIN public.profiles mgr ON mgr.id = p.manager_id
    WHERE p.id = _employee_id
  )
  SELECT DISTINCT recipient.user_id
  FROM (
    SELECT emp.manager_id AS user_id
    FROM emp
    WHERE _stage = 'manager'

    UNION ALL

    SELECT emp.gm_manager_id AS user_id
    FROM emp
    WHERE _stage = 'general_manager'

    UNION ALL

    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE _stage = 'director'
      AND ur.role = 'director'::public.app_role
  ) AS recipient
  WHERE recipient.user_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.create_leave_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_employee_id uuid;
  v_requester_name text;
  v_leave_type_name text;
  v_start_date date;
  v_end_date date;
  v_approval_route text[];
  v_cancellation_route text[];
  v_next_stage text;
  v_next_stage_label text;
  v_current_approval_stage text;
  v_current_cancellation_stage text;
  v_date_span text;
  v_requester_title text;
  v_requester_message text;
  v_monitor_title text;
  v_monitor_message text;
BEGIN
  SELECT
    lr.employee_id,
    concat_ws(' ', p.first_name, p.last_name),
    lt.name,
    lr.start_date,
    lr.end_date,
    lr.approval_route_snapshot::text[],
    lr.cancellation_route_snapshot::text[]
  INTO
    v_employee_id,
    v_requester_name,
    v_leave_type_name,
    v_start_date,
    v_end_date,
    v_approval_route,
    v_cancellation_route
  FROM public.leave_requests lr
  JOIN public.profiles p ON p.id = lr.employee_id
  LEFT JOIN public.leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.id = NEW.leave_request_id;

  IF v_employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_date_span := to_char(v_start_date, 'Mon DD, YYYY') || ' to ' || to_char(v_end_date, 'Mon DD, YYYY');

  -- Determine the next required approver stage (if any) for queue notifications.
  v_next_stage := NULL;

  IF NEW.event_type IN ('leave_created', 'leave_resubmitted', 'leave_document_attached') THEN
    v_next_stage := public.next_leave_stage_from_route(v_approval_route, NULL);
  ELSIF NEW.event_type = 'leave_status_changed' AND NEW.to_status IN ('manager_approved', 'gm_approved') THEN
    v_current_approval_stage := CASE NEW.to_status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      ELSE NULL
    END;
    v_next_stage := public.next_leave_stage_from_route(v_approval_route, v_current_approval_stage);
  ELSIF NEW.event_type IN ('leave_cancellation_requested', 'leave_cancellation_re_requested') THEN
    v_next_stage := public.next_leave_stage_from_route(v_cancellation_route, NULL);
  ELSIF NEW.event_type = 'leave_cancellation_stage_approved'
    AND NEW.to_cancellation_status IN ('manager_approved', 'gm_approved')
  THEN
    v_current_cancellation_stage := CASE NEW.to_cancellation_status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      ELSE NULL
    END;
    v_next_stage := public.next_leave_stage_from_route(v_cancellation_route, v_current_cancellation_stage);
  END IF;

  v_next_stage_label := CASE v_next_stage
    WHEN 'manager' THEN 'Manager'
    WHEN 'general_manager' THEN 'General Manager'
    WHEN 'director' THEN 'Director'
    ELSE NULL
  END;

  -- Notify the next approver in the route.
  IF v_next_stage IS NOT NULL THEN
    INSERT INTO public.user_notifications (
      user_id,
      category,
      event_type,
      title,
      message,
      metadata,
      source_table,
      source_id,
      leave_request_id,
      leave_request_event_id
    )
    SELECT DISTINCT
      r.user_id,
      'leave',
      NEW.event_type,
      CASE
        WHEN NEW.event_type LIKE 'leave_cancellation%' THEN 'Leave cancellation approval required'
        ELSE 'Leave approval required'
      END,
      CASE
        WHEN NEW.event_type LIKE 'leave_cancellation%' THEN
          format(
            '%s requested cancellation for %s leave (%s). Your %s approval is required.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(v_next_stage_label, 'workflow')
          )
        ELSE
          format(
            '%s has a %s leave request (%s) awaiting %s approval.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(v_next_stage_label, 'workflow')
          )
      END,
      jsonb_build_object(
        'next_stage', v_next_stage,
        'next_stage_label', v_next_stage_label,
        'event_type', NEW.event_type,
        'occurred_at', NEW.occurred_at
      ),
      'leave_request_events',
      NEW.id,
      NEW.leave_request_id,
      NEW.id
    FROM public.leave_stage_recipients(v_employee_id, v_next_stage) r
    WHERE r.user_id IS DISTINCT FROM NEW.actor_user_id
    ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
  END IF;

  -- Requester notifications for approver-driven outcomes/progress.
  IF NEW.event_type IN (
    'leave_status_changed',
    'leave_document_requested',
    'leave_rejected',
    'leave_final_approved',
    'leave_cancellation_stage_approved',
    'leave_cancellation_approved',
    'leave_cancellation_rejected'
  ) THEN
    IF NEW.event_type = 'leave_status_changed' AND NEW.to_status NOT IN ('manager_approved', 'gm_approved') THEN
      -- Skip noisy generic status changes; terminal/final statuses are covered by dedicated events.
      NULL;
    ELSE
      v_requester_title := CASE
        WHEN NEW.event_type = 'leave_document_requested' THEN 'Supporting document requested'
        WHEN NEW.event_type = 'leave_rejected' THEN 'Leave request rejected'
        WHEN NEW.event_type = 'leave_final_approved' THEN 'Leave request approved'
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN 'Cancellation request progressed'
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN 'Cancellation request approved'
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN 'Cancellation request rejected'
        ELSE 'Leave request updated'
      END;

      v_requester_message := CASE
        WHEN NEW.event_type = 'leave_status_changed' AND NEW.to_status = 'manager_approved' THEN
          format('Your %s leave request (%s) was approved by Manager and is awaiting the next approver.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_status_changed' AND NEW.to_status = 'gm_approved' THEN
          format('Your %s leave request (%s) was approved by General Manager and is awaiting Director approval.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_document_requested' THEN
          format('A supporting document was requested for your %s leave request (%s).',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_rejected' THEN
          format('Your %s leave request (%s) was rejected.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_final_approved' THEN
          format('Your %s leave request (%s) was fully approved.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN
          format('Your cancellation request for %s leave (%s) has progressed to the next approver.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN
          format('Your cancellation request for %s leave (%s) was approved and the leave was cancelled.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN
          format('Your cancellation request for %s leave (%s) was rejected.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
        ELSE
          format('Your %s leave request (%s) was updated.',
            coalesce(v_leave_type_name, 'leave'),
            v_date_span
          )
      END;

      INSERT INTO public.user_notifications (
        user_id,
        category,
        event_type,
        title,
        message,
        metadata,
        source_table,
        source_id,
        leave_request_id,
        leave_request_event_id
      )
      VALUES (
        v_employee_id,
        'leave',
        NEW.event_type,
        v_requester_title,
        v_requester_message,
        jsonb_build_object(
          'event_type', NEW.event_type,
          'from_status', NEW.from_status,
          'to_status', NEW.to_status,
          'from_cancellation_status', NEW.from_cancellation_status,
          'to_cancellation_status', NEW.to_cancellation_status
        ),
        'leave_request_events',
        NEW.id,
        NEW.leave_request_id,
        NEW.id
      )
      ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
    END IF;
  END IF;

  -- HR/Admin monitor notifications (view-only oversight).
  IF NEW.event_type IN (
    'leave_created',
    'leave_resubmitted',
    'leave_status_changed',
    'leave_document_requested',
    'leave_document_attached',
    'leave_rejected',
    'leave_final_approved',
    'leave_cancellation_requested',
    'leave_cancellation_re_requested',
    'leave_cancellation_stage_approved',
    'leave_cancellation_approved',
    'leave_cancellation_rejected'
  ) THEN
    IF NOT (NEW.event_type = 'leave_status_changed' AND NEW.to_status NOT IN ('manager_approved', 'gm_approved')) THEN
      v_monitor_title := 'Leave workflow update';
      v_monitor_message := CASE
        WHEN NEW.event_type = 'leave_created' THEN
          format('%s submitted a %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_resubmitted' THEN
          format('%s resubmitted a %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_status_changed' THEN
          format('%s''s %s leave request (%s) progressed to %s.',
            v_requester_name,
            coalesce(v_leave_type_name, 'leave'),
            v_date_span,
            coalesce(NEW.to_status, 'updated')
          )
        WHEN NEW.event_type = 'leave_document_requested' THEN
          format('Supporting document requested for %s''s %s leave request (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_document_attached' THEN
          format('%s attached a supporting document for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_rejected' THEN
          format('%s''s %s leave request (%s) was rejected.', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_final_approved' THEN
          format('%s''s %s leave request (%s) was fully approved.', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_requested' THEN
          format('%s requested cancellation for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_re_requested' THEN
          format('%s re-requested cancellation for %s leave (%s).', v_requester_name, coalesce(v_leave_type_name, 'leave'), v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_stage_approved' THEN
          format('%s''s leave cancellation request (%s) progressed to %s.',
            v_requester_name,
            v_date_span,
            coalesce(NEW.to_cancellation_status, 'the next stage')
          )
        WHEN NEW.event_type = 'leave_cancellation_approved' THEN
          format('%s''s leave cancellation request (%s) was approved.', v_requester_name, v_date_span)
        WHEN NEW.event_type = 'leave_cancellation_rejected' THEN
          format('%s''s leave cancellation request (%s) was rejected.', v_requester_name, v_date_span)
        ELSE
          format('%s''s leave request (%s) was updated.', v_requester_name, v_date_span)
      END;

      INSERT INTO public.user_notifications (
        user_id,
        category,
        event_type,
        title,
        message,
        metadata,
        source_table,
        source_id,
        leave_request_id,
        leave_request_event_id
      )
      SELECT DISTINCT
        ur.user_id,
        'leave',
        NEW.event_type,
        v_monitor_title,
        v_monitor_message,
        jsonb_build_object(
          'event_type', NEW.event_type,
          'from_status', NEW.from_status,
          'to_status', NEW.to_status,
          'from_cancellation_status', NEW.from_cancellation_status,
          'to_cancellation_status', NEW.to_cancellation_status
        ),
        'leave_request_events',
        NEW.id,
        NEW.leave_request_id,
        NEW.id
      FROM public.user_roles ur
      WHERE ur.role IN ('hr'::public.app_role, 'admin'::public.app_role)
        AND ur.user_id IS DISTINCT FROM NEW.actor_user_id
      ON CONFLICT (user_id, leave_request_event_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_create_leave_event_notifications ON public.leave_request_events;
CREATE TRIGGER zzzz_create_leave_event_notifications
AFTER INSERT ON public.leave_request_events
FOR EACH ROW
EXECUTE FUNCTION public.create_leave_event_notifications();

ANALYZE public.user_notifications;
