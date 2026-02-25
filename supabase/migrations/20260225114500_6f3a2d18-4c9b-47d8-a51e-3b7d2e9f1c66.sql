CREATE TABLE IF NOT EXISTS public.workflow_config_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_type text NOT NULL CHECK (workflow_type IN ('leave_approval', 'leave_cancellation')),
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  workflow_table text NOT NULL CHECK (workflow_table IN ('leave_approval_workflows', 'leave_cancellation_workflows')),
  workflow_row_id uuid NOT NULL,
  requester_role public.app_role NOT NULL,
  department_id uuid,
  changed_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_role public.app_role,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_created_at
  ON public.workflow_config_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_workflow_type_scope
  ON public.workflow_config_events (workflow_type, department_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_config_events_changed_by_user
  ON public.workflow_config_events (changed_by_user_id, created_at DESC);

ALTER TABLE public.workflow_config_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_config_events_select_privileged ON public.workflow_config_events;
CREATE POLICY workflow_config_events_select_privileged
ON public.workflow_config_events
FOR SELECT
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

REVOKE ALL ON public.workflow_config_events FROM anon;
GRANT SELECT ON public.workflow_config_events TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_notifications_user_source_unique
  ON public.user_notifications (user_id, source_table, source_id);

CREATE OR REPLACE FUNCTION public.log_workflow_config_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_actor_user_id uuid := public.request_user_id();
  v_actor_role public.app_role := NULL;
  v_workflow_type text;
  v_action text;
  v_old_values jsonb := NULL;
  v_new_values jsonb := NULL;
  v_event_ts timestamptz := now();
  v_scope_department_id uuid := NULL;
  v_requester_role public.app_role;
BEGIN
  IF v_actor_user_id IS NOT NULL THEN
    SELECT ur.role
    INTO v_actor_role
    FROM public.user_roles ur
    WHERE ur.user_id = v_actor_user_id
    LIMIT 1;
  END IF;

  v_workflow_type := CASE TG_TABLE_NAME
    WHEN 'leave_approval_workflows' THEN 'leave_approval'
    WHEN 'leave_cancellation_workflows' THEN 'leave_cancellation'
    ELSE NULL
  END;

  IF v_workflow_type IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_scope_department_id := NEW.department_id;
    v_requester_role := NEW.requester_role;
    v_new_values := jsonb_build_object(
      'requester_role', NEW.requester_role,
      'department_id', NEW.department_id,
      'approval_stages', coalesce(to_jsonb(NEW.approval_stages), '[]'::jsonb),
      'is_active', NEW.is_active,
      'notes', NEW.notes
    );
    v_event_ts := coalesce(NEW.updated_at, NEW.created_at, now());

  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'updated';
    v_scope_department_id := NEW.department_id;
    v_requester_role := NEW.requester_role;
    v_old_values := jsonb_build_object(
      'requester_role', OLD.requester_role,
      'department_id', OLD.department_id,
      'approval_stages', coalesce(to_jsonb(OLD.approval_stages), '[]'::jsonb),
      'is_active', OLD.is_active,
      'notes', OLD.notes
    );
    v_new_values := jsonb_build_object(
      'requester_role', NEW.requester_role,
      'department_id', NEW.department_id,
      'approval_stages', coalesce(to_jsonb(NEW.approval_stages), '[]'::jsonb),
      'is_active', NEW.is_active,
      'notes', NEW.notes
    );
    IF v_old_values IS NOT DISTINCT FROM v_new_values THEN
      RETURN NEW;
    END IF;
    v_event_ts := coalesce(NEW.updated_at, now());

  ELSE
    v_action := 'deleted';
    v_scope_department_id := OLD.department_id;
    v_requester_role := OLD.requester_role;
    v_old_values := jsonb_build_object(
      'requester_role', OLD.requester_role,
      'department_id', OLD.department_id,
      'approval_stages', coalesce(to_jsonb(OLD.approval_stages), '[]'::jsonb),
      'is_active', OLD.is_active,
      'notes', OLD.notes
    );
    v_event_ts := coalesce(OLD.updated_at, OLD.created_at, now());
  END IF;

  INSERT INTO public.workflow_config_events (
    workflow_type,
    action,
    workflow_table,
    workflow_row_id,
    requester_role,
    department_id,
    changed_by_user_id,
    changed_by_role,
    old_values,
    new_values,
    metadata,
    created_at
  )
  VALUES (
    v_workflow_type,
    v_action,
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    v_requester_role,
    v_scope_department_id,
    v_actor_user_id,
    v_actor_role,
    v_old_values,
    v_new_values,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP
    ),
    v_event_ts
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS zzzz_log_leave_approval_workflow_events ON public.leave_approval_workflows;
CREATE TRIGGER zzzz_log_leave_approval_workflow_events
AFTER INSERT OR UPDATE OR DELETE ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.log_workflow_config_events();

DROP TRIGGER IF EXISTS zzzz_log_leave_cancellation_workflow_events ON public.leave_cancellation_workflows;
CREATE TRIGGER zzzz_log_leave_cancellation_workflow_events
AFTER INSERT OR UPDATE OR DELETE ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.log_workflow_config_events();

CREATE OR REPLACE FUNCTION public.create_workflow_config_event_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_department_name text;
  v_scope_label text;
  v_workflow_label text;
  v_action_label text;
  v_title text;
  v_message text;
BEGIN
  IF NEW.workflow_type NOT IN ('leave_approval', 'leave_cancellation') THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT d.name INTO v_department_name
    FROM public.departments d
    WHERE d.id = NEW.department_id;
  END IF;

  v_scope_label := coalesce(v_department_name, 'All Departments (Default)');
  v_workflow_label := CASE NEW.workflow_type
    WHEN 'leave_approval' THEN 'Leave approval workflow'
    WHEN 'leave_cancellation' THEN 'Leave cancellation workflow'
    ELSE 'Workflow'
  END;
  v_action_label := CASE NEW.action
    WHEN 'created' THEN 'created'
    WHEN 'updated' THEN 'updated'
    WHEN 'deleted' THEN 'deleted'
    ELSE 'changed'
  END;

  v_title := 'Workflow configuration updated';
  v_message := format(
    '%s (%s) was %s for %s.',
    v_workflow_label,
    coalesce(NEW.requester_role::text, 'employee'),
    v_action_label,
    v_scope_label
  );

  INSERT INTO public.user_notifications (
    user_id,
    category,
    event_type,
    title,
    message,
    metadata,
    source_table,
    source_id
  )
  SELECT DISTINCT
    ur.user_id,
    'admin',
    format('%s_workflow_%s', NEW.workflow_type, NEW.action),
    v_title,
    v_message,
    jsonb_build_object(
      'workflow_type', NEW.workflow_type,
      'action', NEW.action,
      'workflow_table', NEW.workflow_table,
      'workflow_row_id', NEW.workflow_row_id,
      'department_id', NEW.department_id,
      'requester_role', NEW.requester_role,
      'changed_by_user_id', NEW.changed_by_user_id,
      'changed_by_role', NEW.changed_by_role
    ),
    'workflow_config_events',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('hr'::public.app_role, 'admin'::public.app_role, 'director'::public.app_role)
    AND ur.user_id IS DISTINCT FROM NEW.changed_by_user_id
  ON CONFLICT (user_id, source_table, source_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzzz_create_workflow_config_event_notifications ON public.workflow_config_events;
CREATE TRIGGER zzzz_create_workflow_config_event_notifications
AFTER INSERT ON public.workflow_config_events
FOR EACH ROW
EXECUTE FUNCTION public.create_workflow_config_event_notifications();

ANALYZE public.workflow_config_events;
