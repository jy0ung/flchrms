-- HRMS Public Schema Snapshot
-- Generated from local Supabase DB container 'supabase-db'
-- Schema-only snapshot for deterministic review/diff.
-- Note: bootstrap defaults/seeds remain in migrations/default_schema until Phase 8B split.

--
-- PostgreSQL database dump
--


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'hr',
    'manager',
    'employee',
    'general_manager',
    'director'
);


--
-- Name: deduction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.deduction_type AS ENUM (
    'fixed',
    'percentage'
);


--
-- Name: document_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_category AS ENUM (
    'contract',
    'certificate',
    'official',
    'other'
);


--
-- Name: payroll_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payroll_status AS ENUM (
    'draft',
    'processing',
    'completed',
    'cancelled'
);


--
-- Name: payslip_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payslip_status AS ENUM (
    'pending',
    'paid',
    'cancelled'
);


--
-- Name: admin_reset_user_password(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_reset_user_password(_target_user_id uuid, _new_password text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
    AS $_$
DECLARE
  requester_id UUID;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.has_role(requester_id, 'admin'::public.app_role)
    OR public.has_role(requester_id, 'hr'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required'
      USING ERRCODE = '22004';
  END IF;

  IF pg_catalog.char_length(pg_catalog.coalesce(_new_password, '')) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters'
      USING ERRCODE = '22023';
  END IF;

  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      updated_at = pg_catalog.now(),
      recovery_token = '',
      recovery_sent_at = NULL,
      reauthentication_token = '',
      reauthentication_sent_at = NULL
  WHERE id = _target_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF pg_catalog.to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1'
    USING _target_user_id;
  END IF;

  IF pg_catalog.to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1'
    USING _target_user_id;
  END IF;
END;
$_$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days_count integer NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text,
    manager_approved_by uuid,
    manager_approved_at timestamp with time zone,
    hr_approved_by uuid,
    hr_approved_at timestamp with time zone,
    rejected_by uuid,
    rejected_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    document_url text,
    document_required boolean DEFAULT false,
    manager_comments text,
    amendment_notes text,
    amended_at timestamp with time zone,
    gm_approved_by uuid,
    gm_approved_at timestamp with time zone,
    director_approved_by uuid,
    director_approved_at timestamp with time zone,
    hr_notified_at timestamp with time zone,
    approval_route_snapshot text[],
    final_approved_at timestamp with time zone,
    final_approved_by uuid,
    final_approved_by_role public.app_role,
    cancellation_status text,
    cancellation_route_snapshot text[],
    cancellation_requested_at timestamp with time zone,
    cancellation_requested_by uuid,
    cancellation_reason text,
    cancellation_comments text,
    cancellation_manager_approved_at timestamp with time zone,
    cancellation_manager_approved_by uuid,
    cancellation_gm_approved_at timestamp with time zone,
    cancellation_gm_approved_by uuid,
    cancellation_director_approved_at timestamp with time zone,
    cancellation_director_approved_by uuid,
    cancellation_final_approved_at timestamp with time zone,
    cancellation_final_approved_by uuid,
    cancellation_final_approved_by_role public.app_role,
    cancellation_rejected_at timestamp with time zone,
    cancellation_rejected_by uuid,
    cancellation_rejection_reason text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancelled_by_role public.app_role,
    CONSTRAINT leave_requests_cancellation_status_check CHECK (((cancellation_status IS NULL) OR (cancellation_status = ANY (ARRAY['pending'::text, 'manager_approved'::text, 'gm_approved'::text, 'director_approved'::text, 'approved'::text, 'rejected'::text])))),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'manager_approved'::text, 'gm_approved'::text, 'director_approved'::text, 'hr_approved'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: amend_leave_request(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.amend_leave_request(_request_id uuid, _amendment_notes text, _reason text DEFAULT NULL::text, _document_url text DEFAULT NULL::text) RETURNS public.leave_requests
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  amended_row public.leave_requests%ROWTYPE;
  trimmed_notes TEXT := NULLIF(pg_catalog.btrim(COALESCE(_amendment_notes, '')), '');
  trimmed_reason TEXT := CASE
    WHEN _reason IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_reason), '')
  END;
  trimmed_document_url TEXT := CASE
    WHEN _document_url IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_document_url), '')
  END;
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  IF trimmed_notes IS NULL THEN
    RAISE EXCEPTION 'Amendment notes are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only amend your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled leave requests cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Final-approved leave requests cannot be amended; use cancellation workflow'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.cancellation_status IS NOT NULL THEN
    RAISE EXCEPTION 'Leave requests with cancellation workflow state cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    request_row.status = 'rejected'
    OR (request_row.status = 'pending' AND coalesce(request_row.document_required, false) = true)
  ) THEN
    RAISE EXCEPTION 'Only rejected requests or pending requests with requested documents can be amended'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.leave_requests
  SET status = 'pending',
      amendment_notes = trimmed_notes,
      amended_at = now(),
      reason = COALESCE(trimmed_reason, public.leave_requests.reason),
      document_url = CASE
        WHEN _document_url IS NULL THEN public.leave_requests.document_url
        ELSE trimmed_document_url
      END
  WHERE id = _request_id
  RETURNING * INTO amended_row;

  RETURN amended_row;
END;
$$;


--
-- Name: create_leave_event_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_leave_event_notifications() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: create_workflow_config_event_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_workflow_config_event_notifications() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: delete_user_notifications(integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_notifications(_older_than_days integer DEFAULT 90, _read_only boolean DEFAULT true) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_days integer := coalesce(_older_than_days, 90);
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF v_days < 1 OR v_days > 3650 THEN
    RAISE EXCEPTION 'Retention window must be between 1 and 3650 days.';
  END IF;

  DELETE FROM public.user_notifications n
  WHERE n.user_id = v_user_id
    AND n.created_at < now() - make_interval(days => v_days)
    AND (NOT _read_only OR n.read_at IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: enforce_leave_request_state_consistency(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_leave_request_state_consistency() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  approval_route text[] := coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]);
  cancellation_route text[] := coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]);
  approval_route_len int := coalesce(array_length(approval_route, 1), 0);
  cancellation_route_len int := coalesce(array_length(cancellation_route, 1), 0);
  approval_final_stage text := NULL;
  cancellation_final_stage text := NULL;
  approval_status_stage text := NULL;
  cancellation_status_stage text := NULL;
  final_triplet_count int := 0;
  cancelled_triplet_count int := 0;
  cancellation_final_triplet_count int := 0;
  cancellation_reject_pair_count int := 0;
  cancellation_request_core_count int := 0;
  has_manager_approval boolean := false;
  has_gm_approval boolean := false;
  has_director_approval boolean := false;
  manager_approval_complete boolean := false;
  gm_approval_complete boolean := false;
  director_approval_complete boolean := false;
  has_cancellation_manager_approval boolean := false;
  has_cancellation_gm_approval boolean := false;
  has_cancellation_director_approval boolean := false;
  cancellation_manager_approval_complete boolean := false;
  cancellation_gm_approval_complete boolean := false;
  cancellation_director_approval_complete boolean := false;
BEGIN
  approval_final_stage := CASE WHEN approval_route_len > 0 THEN approval_route[approval_route_len] ELSE NULL END;
  cancellation_final_stage := CASE WHEN cancellation_route_len > 0 THEN cancellation_route[cancellation_route_len] ELSE NULL END;

  approval_status_stage := CASE NEW.status
    WHEN 'manager_approved' THEN 'manager'
    WHEN 'gm_approved' THEN 'general_manager'
    WHEN 'director_approved' THEN 'director'
    ELSE NULL
  END;

  cancellation_status_stage := CASE NEW.cancellation_status
    WHEN 'manager_approved' THEN 'manager'
    WHEN 'gm_approved' THEN 'general_manager'
    WHEN 'director_approved' THEN 'director'
    ELSE NULL
  END;

  has_manager_approval := NEW.manager_approved_at IS NOT NULL OR NEW.manager_approved_by IS NOT NULL;
  has_gm_approval := NEW.gm_approved_at IS NOT NULL OR NEW.gm_approved_by IS NOT NULL;
  has_director_approval := NEW.director_approved_at IS NOT NULL OR NEW.director_approved_by IS NOT NULL;
  manager_approval_complete := NEW.manager_approved_at IS NOT NULL AND NEW.manager_approved_by IS NOT NULL;
  gm_approval_complete := NEW.gm_approved_at IS NOT NULL AND NEW.gm_approved_by IS NOT NULL;
  director_approval_complete := NEW.director_approved_at IS NOT NULL AND NEW.director_approved_by IS NOT NULL;

  has_cancellation_manager_approval := NEW.cancellation_manager_approved_at IS NOT NULL OR NEW.cancellation_manager_approved_by IS NOT NULL;
  has_cancellation_gm_approval := NEW.cancellation_gm_approved_at IS NOT NULL OR NEW.cancellation_gm_approved_by IS NOT NULL;
  has_cancellation_director_approval := NEW.cancellation_director_approved_at IS NOT NULL OR NEW.cancellation_director_approved_by IS NOT NULL;
  cancellation_manager_approval_complete := NEW.cancellation_manager_approved_at IS NOT NULL AND NEW.cancellation_manager_approved_by IS NOT NULL;
  cancellation_gm_approval_complete := NEW.cancellation_gm_approved_at IS NOT NULL AND NEW.cancellation_gm_approved_by IS NOT NULL;
  cancellation_director_approval_complete := NEW.cancellation_director_approved_at IS NOT NULL AND NEW.cancellation_director_approved_by IS NOT NULL;

  -- Approval/cancellation stage stamp pairs must be complete when present.
  IF has_manager_approval AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: manager approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_gm_approval AND NOT gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: GM approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND NOT director_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  IF has_cancellation_manager_approval AND NOT cancellation_manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation manager approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_cancellation_gm_approval AND NOT cancellation_gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;
  IF has_cancellation_director_approval AND NOT cancellation_director_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Core approval finalization metadata must be all-or-none.
  final_triplet_count :=
    (CASE WHEN NEW.final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.final_approved_by_role IS NOT NULL
     AND NEW.final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  -- Cancellation completion metadata must be all-or-none.
  cancelled_triplet_count :=
    (CASE WHEN NEW.cancelled_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancelled_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancelled_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancelled_by_role IS NOT NULL
     AND NEW.cancelled_by_role::text NOT IN ('employee', 'manager', 'general_manager', 'director', 'hr', 'admin')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled_by_role must be a valid application role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_final_triplet_count :=
    (CASE WHEN NEW.cancellation_final_approved_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_final_approved_by_role IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_final_triplet_count NOT IN (0, 3) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation final approval metadata must be set as a complete triplet'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.cancellation_final_approved_by_role IS NOT NULL
     AND NEW.cancellation_final_approved_by_role::text NOT IN ('manager', 'general_manager', 'director', 'hr')
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation_final_approved_by_role must be a valid leave approver role'
      USING ERRCODE = '22023';
  END IF;

  cancellation_reject_pair_count :=
    (CASE WHEN NEW.cancellation_rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_rejected_by IS NOT NULL THEN 1 ELSE 0 END);

  IF cancellation_reject_pair_count NOT IN (0, 2) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  IF ((CASE WHEN NEW.rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.rejected_by IS NOT NULL THEN 1 ELSE 0 END)) NOT IN (0, 2)
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: leave rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Route-aware stage stamp consistency for base approval workflow.
  IF approval_route_len > 0 THEN
    IF NOT ('manager' = ANY(approval_route)) AND has_manager_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager approval stamps present for a route that excludes manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('general_manager' = ANY(approval_route)) AND has_gm_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: GM approval stamps present for a route that excludes general manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('director' = ANY(approval_route)) AND has_director_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: director approval stamps present for a route that excludes director'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF has_gm_approval AND ('manager' = ANY(approval_route)) AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: GM approval requires manager approval stamps when manager is in the route'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND ('manager' = ANY(approval_route)) AND NOT manager_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval requires manager approval stamps when manager is in the route'
      USING ERRCODE = '22023';
  END IF;
  IF has_director_approval AND ('general_manager' = ANY(approval_route)) AND NOT gm_approval_complete THEN
    RAISE EXCEPTION 'leave_requests state invariant: director approval requires GM approval stamps when general manager is in the route'
      USING ERRCODE = '22023';
  END IF;

  IF approval_status_stage IS NOT NULL THEN
    IF approval_route_len = 0 OR NOT (approval_status_stage = ANY(approval_route)) THEN
      RAISE EXCEPTION 'leave_requests state invariant: approval status % is incompatible with approval_route_snapshot', NEW.status
        USING ERRCODE = '22023';
    END IF;

    IF final_triplet_count = 3 THEN
      IF approval_status_stage <> approval_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final approval metadata may only be set when status matches the route final stage'
          USING ERRCODE = '22023';
      END IF;
      IF NEW.final_approved_by_role::text <> approval_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final_approved_by_role must match the route final stage role'
          USING ERRCODE = '22023';
      END IF;
    ELSIF approval_status_stage = approval_final_stage THEN
      RAISE EXCEPTION 'leave_requests state invariant: status at route final stage requires final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Final-approved rows should never be pending or rejected.
  IF NEW.final_approved_at IS NOT NULL AND NEW.status IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'leave_requests state invariant: final-approved leave cannot have pending/rejected status'
      USING ERRCODE = '22023';
  END IF;

  -- Status-specific core requirements + route-aware future stamp prevention.
  IF NEW.status = 'pending' THEN
    IF has_manager_approval
       OR has_gm_approval
       OR has_director_approval
       OR NEW.hr_approved_at IS NOT NULL
       OR NEW.hr_approved_by IS NOT NULL
       OR NEW.rejected_at IS NOT NULL
       OR NEW.rejected_by IS NOT NULL
       OR NEW.cancelled_at IS NOT NULL
       OR NEW.cancelled_by IS NOT NULL
       OR NEW.final_approved_at IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: pending leave cannot carry approval/rejection/cancellation stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'manager_approved' THEN
    IF NOT manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status requires manager approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF has_gm_approval OR has_director_approval OR NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status cannot contain later-stage approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'gm_approved' THEN
    IF NOT gm_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status requires GM approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF has_director_approval OR NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status cannot contain later-stage approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'director_approved' THEN
    IF NOT director_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status requires director approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.hr_approved_at IS NOT NULL OR NEW.hr_approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status cannot contain hr_approved stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'hr_approved' THEN
    IF NEW.hr_approved_at IS NULL OR NEW.hr_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status requires HR approval stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 3 THEN
      RAISE EXCEPTION 'leave_requests state invariant: hr_approved status must include final approval metadata'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    IF NEW.rejected_at IS NULL OR NEW.rejected_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected status requires rejection stamps'
        USING ERRCODE = '22023';
    END IF;
    IF final_triplet_count <> 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have final approval metadata'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.cancellation_status IS NOT NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot have cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF NEW.cancelled_at IS NULL OR NEW.cancelled_by IS NULL OR NEW.cancelled_by_role IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancelled status requires cancelled_at/cancelled_by/cancelled_by_role'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.status <> 'cancelled' AND cancelled_triplet_count <> 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancelled metadata may only be present when status is cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF (
    NEW.status <> 'pending'
    OR NEW.final_approved_at IS NOT NULL
    OR NEW.cancellation_status IS NOT NULL
  ) AND approval_route_len = 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot is required for non-pending or final/cancellation states'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.final_approved_at IS NULL AND (
    NEW.cancellation_status IS NOT NULL
    OR NEW.cancellation_route_snapshot IS NOT NULL
    OR NEW.cancellation_requested_at IS NOT NULL
    OR NEW.cancellation_requested_by IS NOT NULL
    OR NEW.cancellation_reason IS NOT NULL
    OR NEW.cancellation_comments IS NOT NULL
    OR has_cancellation_manager_approval
    OR has_cancellation_gm_approval
    OR has_cancellation_director_approval
    OR NEW.cancellation_final_approved_at IS NOT NULL
    OR NEW.cancellation_final_approved_by IS NOT NULL
    OR NEW.cancellation_final_approved_by_role IS NOT NULL
    OR NEW.cancellation_rejected_at IS NOT NULL
    OR NEW.cancellation_rejected_by IS NOT NULL
    OR NEW.cancellation_rejection_reason IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'leave_requests state invariant: cancellation workflow data requires a final-approved leave request'
      USING ERRCODE = '22023';
  END IF;

  cancellation_request_core_count :=
    (CASE WHEN NEW.cancellation_requested_at IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN NEW.cancellation_requested_by IS NOT NULL THEN 1 ELSE 0 END);

  IF NEW.cancellation_status IS NULL THEN
    IF NEW.cancellation_route_snapshot IS NOT NULL
       OR NEW.cancellation_requested_at IS NOT NULL
       OR NEW.cancellation_requested_by IS NOT NULL
       OR NEW.cancellation_reason IS NOT NULL
       OR NEW.cancellation_comments IS NOT NULL
       OR has_cancellation_manager_approval
       OR has_cancellation_gm_approval
       OR has_cancellation_director_approval
       OR NEW.cancellation_final_approved_at IS NOT NULL
       OR NEW.cancellation_final_approved_by IS NOT NULL
       OR NEW.cancellation_final_approved_by_role IS NOT NULL
       OR NEW.cancellation_rejected_at IS NOT NULL
       OR NEW.cancellation_rejected_by IS NOT NULL
       OR NEW.cancellation_rejection_reason IS NOT NULL
    THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation fields must be cleared when cancellation_status is NULL'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    IF cancellation_route_len = 0 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation_route_snapshot is required when cancellation_status is set'
        USING ERRCODE = '22023';
    END IF;

    IF cancellation_request_core_count <> 2 THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation request metadata must include requester and timestamp'
        USING ERRCODE = '22023';
    END IF;

    IF NEW.status = 'rejected' THEN
      RAISE EXCEPTION 'leave_requests state invariant: rejected leave cannot carry cancellation workflow state'
        USING ERRCODE = '22023';
    END IF;

    -- Route-aware stage stamp consistency for cancellation workflow.
    IF NOT ('manager' = ANY(cancellation_route)) AND has_cancellation_manager_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation manager approval stamps present for a route that excludes manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('general_manager' = ANY(cancellation_route)) AND has_cancellation_gm_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval stamps present for a route that excludes general manager'
        USING ERRCODE = '22023';
    END IF;
    IF NOT ('director' = ANY(cancellation_route)) AND has_cancellation_director_approval THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval stamps present for a route that excludes director'
        USING ERRCODE = '22023';
    END IF;

    IF has_cancellation_gm_approval AND ('manager' = ANY(cancellation_route)) AND NOT cancellation_manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation GM approval requires manager approval stamps when manager is in the route'
        USING ERRCODE = '22023';
    END IF;
    IF has_cancellation_director_approval AND ('manager' = ANY(cancellation_route)) AND NOT cancellation_manager_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval requires manager approval stamps when manager is in the route'
        USING ERRCODE = '22023';
    END IF;
    IF has_cancellation_director_approval AND ('general_manager' = ANY(cancellation_route)) AND NOT cancellation_gm_approval_complete THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation director approval requires GM approval stamps when general manager is in the route'
        USING ERRCODE = '22023';
    END IF;

    IF cancellation_status_stage IS NOT NULL THEN
      IF NOT (cancellation_status_stage = ANY(cancellation_route)) THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation status % is incompatible with cancellation_route_snapshot', NEW.cancellation_status
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_status_stage = cancellation_final_stage THEN
        RAISE EXCEPTION 'leave_requests state invariant: final cancellation stage must be represented by cancellation_status=approved'
          USING ERRCODE = '22023';
      END IF;
    END IF;

    IF NEW.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot exist on cancelled leave'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'pending' THEN
        IF has_cancellation_manager_approval OR has_cancellation_gm_approval OR has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation_status=pending cannot contain approver-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'manager_approved' THEN
        IF NOT cancellation_manager_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status requires manager approval stamps'
            USING ERRCODE = '22023';
        END IF;
        IF has_cancellation_gm_approval OR has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status cannot contain later-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'gm_approved' THEN
        IF NOT cancellation_gm_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status requires GM approval stamps'
            USING ERRCODE = '22023';
        END IF;
        IF has_cancellation_director_approval THEN
          RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status cannot contain later-stage cancellation stamps'
            USING ERRCODE = '22023';
        END IF;
      ELSIF NEW.cancellation_status = 'director_approved' THEN
        IF NOT cancellation_director_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: director_approved cancellation status requires director approval stamps'
            USING ERRCODE = '22023';
        END IF;
      END IF;

      IF cancellation_final_triplet_count <> 0
         OR cancellation_reject_pair_count <> 0
         OR NEW.cancellation_rejection_reason IS NOT NULL
         OR cancelled_triplet_count <> 0
      THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot contain final/rejected/cancelled stamps'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'approved' THEN
      IF NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation_status=approved requires status=cancelled'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires final cancellation approval metadata'
          USING ERRCODE = '22023';
      END IF;
      IF cancelled_triplet_count <> 3 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires cancelled metadata'
          USING ERRCODE = '22023';
      END IF;

      IF cancellation_final_stage IS NULL THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires a cancellation route'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancelled_by_role::text <> NEW.cancellation_final_approved_by_role::text THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancelled_by_role must match cancellation_final_approved_by_role for approved cancellations'
          USING ERRCODE = '22023';
      END IF;

      -- Legacy rows may have HR as the historical cancellation final approver. Preserve them, but
      -- enforce strict route-aware matching for all current canonical approver roles.
      IF NEW.cancellation_final_approved_by_role::text <> 'hr' THEN
        IF NEW.cancellation_final_approved_by_role::text <> cancellation_final_stage THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation_final_approved_by_role must match the route final stage role'
            USING ERRCODE = '22023';
        END IF;

        IF cancellation_final_stage = 'manager' AND NOT cancellation_manager_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires manager approval stamps for manager-final route'
            USING ERRCODE = '22023';
        END IF;
        IF cancellation_final_stage = 'general_manager' AND NOT cancellation_gm_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires GM approval stamps for GM-final route'
            USING ERRCODE = '22023';
        END IF;
        IF cancellation_final_stage = 'director' AND NOT cancellation_director_approval_complete THEN
          RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state requires director approval stamps for director-final route'
            USING ERRCODE = '22023';
        END IF;
      END IF;

      IF cancellation_reject_pair_count <> 0 OR NEW.cancellation_rejection_reason IS NOT NULL THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation approved state cannot contain rejection metadata'
          USING ERRCODE = '22023';
      END IF;
    ELSIF NEW.cancellation_status = 'rejected' THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot have cancelled leave status'
          USING ERRCODE = '22023';
      END IF;
      IF cancellation_reject_pair_count <> 2 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state requires rejection metadata'
          USING ERRCODE = '22023';
      END IF;
      IF cancellation_final_triplet_count <> 0 OR cancelled_triplet_count <> 0 THEN
        RAISE EXCEPTION 'leave_requests state invariant: cancellation rejected state cannot contain final cancellation/cancelled metadata'
          USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_leave_request_transition_sequencing(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_leave_request_transition_sequencing() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  old_status_rank int := NULL;
  new_status_rank int := NULL;
  old_cancel_rank int := NULL;
  new_cancel_rank int := NULL;
  has_amendment_note boolean := coalesce(NULLIF(btrim(coalesce(NEW.amendment_notes, '')), ''), NULL) IS NOT NULL;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Amendment metadata should be coherent and monotonic.
  IF NEW.amended_at IS NULL AND has_amendment_note THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amendment_notes requires amended_at'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.amended_at IS NOT NULL AND NOT has_amendment_note THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at requires non-empty amendment_notes'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.amended_at IS NOT NULL AND NEW.created_at IS NOT NULL AND NEW.amended_at < NEW.created_at THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at cannot be earlier than created_at'
      USING ERRCODE = '22023';
  END IF;

  IF OLD.amended_at IS NOT NULL AND NEW.amended_at IS NOT NULL AND NEW.amended_at < OLD.amended_at THEN
    RAISE EXCEPTION 'leave_requests transition invariant: amended_at must be monotonic'
      USING ERRCODE = '22023';
  END IF;

  -- Cancelled requests are terminal in the current model.
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'leave_requests transition invariant: cancelled requests cannot be reopened'
      USING ERRCODE = '22023';
  END IF;

  -- Approved requests must use the cancellation workflow; they cannot be directly resubmitted to pending.
  IF OLD.final_approved_at IS NOT NULL
     AND OLD.status <> 'cancelled'
     AND NEW.status = 'pending'
  THEN
    RAISE EXCEPTION 'leave_requests transition invariant: final-approved leave cannot be resubmitted to pending; use cancellation workflow'
      USING ERRCODE = '22023';
  END IF;

  -- Rejected -> pending is the supported resubmit path and must carry fresh amendment metadata.
  IF OLD.status = 'rejected' AND NEW.status = 'pending' THEN
    IF NEW.amended_at IS NULL OR NOT has_amendment_note THEN
      RAISE EXCEPTION 'leave_requests transition invariant: rejected leave resubmission requires amended_at and amendment_notes'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.amended_at IS NOT DISTINCT FROM OLD.amended_at
       AND NEW.amendment_notes IS NOT DISTINCT FROM OLD.amendment_notes
       AND NEW.reason IS NOT DISTINCT FROM OLD.reason
       AND NEW.document_url IS NOT DISTINCT FROM OLD.document_url
    THEN
      RAISE EXCEPTION 'leave_requests transition invariant: rejected leave resubmission must change amendment metadata, reason, or document'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Guard against arbitrary rollback between approval stages.
  old_status_rank := CASE OLD.status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'hr_approved' THEN 4
    ELSE NULL
  END;
  new_status_rank := CASE NEW.status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'hr_approved' THEN 4
    ELSE NULL
  END;

  IF old_status_rank IS NOT NULL AND new_status_rank IS NOT NULL AND new_status_rank < old_status_rank THEN
    -- The only supported backward move to pending is rejected -> pending resubmission, which is handled above.
    RAISE EXCEPTION 'leave_requests transition invariant: approval stage rollback is not allowed (% -> %)', OLD.status, NEW.status
      USING ERRCODE = '22023';
  END IF;

  -- Cancellation workflow re-requests may go rejected -> pending, but active-stage rollback is not allowed.
  old_cancel_rank := CASE OLD.cancellation_status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'approved' THEN 4
    ELSE NULL
  END;
  new_cancel_rank := CASE NEW.cancellation_status
    WHEN 'pending' THEN 0
    WHEN 'manager_approved' THEN 1
    WHEN 'gm_approved' THEN 2
    WHEN 'director_approved' THEN 3
    WHEN 'approved' THEN 4
    ELSE NULL
  END;

  IF old_cancel_rank IS NOT NULL AND new_cancel_rank IS NOT NULL AND new_cancel_rank < old_cancel_rank THEN
    RAISE EXCEPTION 'leave_requests transition invariant: cancellation workflow stage rollback is not allowed (% -> %)', OLD.cancellation_status, NEW.cancellation_status
      USING ERRCODE = '22023';
  END IF;

  IF OLD.cancellation_status = 'rejected' AND NEW.cancellation_status = 'pending' THEN
    IF NEW.cancellation_requested_at IS NULL OR NEW.cancellation_requested_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests transition invariant: cancellation re-request requires requester and timestamp'
        USING ERRCODE = '22023';
    END IF;
    IF NEW.cancellation_requested_at IS NOT DISTINCT FROM OLD.cancellation_requested_at
       AND NEW.cancellation_reason IS NOT DISTINCT FROM OLD.cancellation_reason
    THEN
      RAISE EXCEPTION 'leave_requests transition invariant: cancellation re-request must refresh request metadata'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_profiles_admin_update_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_profiles_admin_update_scope() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  actor_id uuid;
  old_filtered jsonb;
  new_filtered jsonb;
BEGIN
  actor_id := public.request_user_id();

  -- Allow backend/migration contexts with no request user.
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- HR and Director keep full profile update capability (subject to RLS row checks).
  IF public.has_role(actor_id, 'hr'::public.app_role)
     OR public.has_role(actor_id, 'director'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Admin can only change username alias. Ignore updated_at because it is changed
  -- by the standard timestamp trigger on every update.
  IF public.has_role(actor_id, 'admin'::public.app_role) THEN
    old_filtered := to_jsonb(OLD) - 'username' - 'updated_at';
    new_filtered := to_jsonb(NEW) - 'username' - 'updated_at';

    IF old_filtered IS DISTINCT FROM new_filtered THEN
      RAISE EXCEPTION 'Admin can only update username aliases from this endpoint.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: enforce_username_admin_hr_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_username_admin_hr_only() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'auth'
    AS $$
DECLARE
  requester_id UUID;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  requester_id := auth.uid();

  -- Allow system/migration/service-role style operations where no end-user JWT is present.
  IF requester_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(requester_id, 'admin'::public.app_role)
     OR public.has_role(requester_id, 'hr'::public.app_role) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Only HR/Admin can change username aliases'
    USING ERRCODE = '42501';
END;
$$;


--
-- Name: enqueue_notification_email_delivery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enqueue_notification_email_delivery() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: generate_unique_username(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_unique_username(_base text, _profile_id uuid DEFAULT NULL::uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  normalized_base TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  normalized_base := public.normalize_username(_base);

  IF normalized_base IS NULL THEN
    normalized_base := 'user';
  END IF;

  LOOP
    candidate := CASE
      WHEN suffix = 0 THEN normalized_base
      ELSE normalized_base || '_' || suffix::TEXT
    END;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = lower(candidate)
        AND (_profile_id IS NULL OR p.id <> _profile_id)
    );

    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;


--
-- Name: get_calendar_visible_leaves(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_calendar_visible_leaves(_start_date date, _end_date date) RETURNS TABLE(id uuid, start_date date, end_date date, status text, final_approved_at timestamp with time zone, employee_first_name text, employee_last_name text, leave_type_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF public.request_user_id() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _start_date IS NULL OR _end_date IS NULL THEN
    RAISE EXCEPTION 'Start and end dates are required'
      USING ERRCODE = '22004';
  END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.start_date,
    lr.end_date,
    lr.status,
    lr.final_approved_at,
    p.first_name AS employee_first_name,
    p.last_name AS employee_last_name,
    lt.name AS leave_type_name
  FROM public.leave_requests lr
  JOIN public.profiles p
    ON p.id = lr.employee_id
  JOIN public.leave_types lt
    ON lt.id = lr.leave_type_id
  WHERE lr.final_approved_at IS NOT NULL
    AND lr.status NOT IN ('cancelled', 'rejected')
    AND lr.start_date <= _end_date
    AND lr.end_date >= _start_date
  ORDER BY lr.start_date ASC, p.first_name ASC, p.last_name ASC;
END;
$$;


--
-- Name: get_employee_directory_profiles(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_employee_directory_profiles(_profile_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, employee_id text, email text, username text, first_name text, last_name text, phone text, avatar_url text, department_id uuid, job_title text, hire_date date, manager_id uuid, status text, created_at timestamp with time zone, updated_at timestamp with time zone, department jsonb)
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  WITH caller AS (
    SELECT public.has_role(public.request_user_id(), 'admin'::public.app_role) AS is_admin
  )
  SELECT
    p.id,
    CASE WHEN caller.is_admin THEN NULL ELSE p.employee_id END AS employee_id,
    p.email,
    p.username,
    p.first_name,
    p.last_name,
    CASE WHEN caller.is_admin THEN NULL ELSE p.phone END AS phone,
    p.avatar_url,
    p.department_id,
    p.job_title,
    p.hire_date,
    p.manager_id,
    p.status,
    p.created_at,
    p.updated_at,
    CASE
      WHEN d.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'manager_id', d.manager_id,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      )
    END AS department
  FROM public.profiles p
  LEFT JOIN public.departments d
    ON d.id = p.department_id
  CROSS JOIN caller
  WHERE _profile_id IS NULL OR p.id = _profile_id
  ORDER BY p.first_name, p.last_name;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  default_role app_role := 'employee';
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, first_name, last_name, employee_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'EMP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 4)
  );
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_department_manager(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_department_manager(_manager_id uuid, _employee_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles manager
    JOIN public.profiles employee ON employee.id = _employee_id
    WHERE manager.id = _manager_id 
    AND manager.department_id IS NOT NULL
    AND manager.department_id = employee.department_id
  )
$$;


--
-- Name: is_manager_of(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_manager_of(_manager_id uuid, _employee_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _employee_id AND manager_id = _manager_id
  )
$$;


--
-- Name: leave_stage_recipients(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.leave_stage_recipients(_employee_id uuid, _stage text) RETURNS TABLE(user_id uuid)
    LANGUAGE sql STABLE
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


--
-- Name: log_leave_request_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_leave_request_events() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  actor_id uuid := NULL;
  actor_role_value public.app_role := NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      to_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_created',
      coalesce(NEW.created_at, now()),
      NEW.employee_id,
      'employee',
      NEW.status,
      NEW.cancellation_status,
      jsonb_build_object(
        'start_date', NEW.start_date,
        'end_date', NEW.end_date,
        'days_count', NEW.days_count,
        'approval_route_snapshot', coalesce(to_jsonb(NEW.approval_route_snapshot), 'null'::jsonb)
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    actor_id := CASE NEW.status
      WHEN 'manager_approved' THEN NEW.manager_approved_by
      WHEN 'gm_approved' THEN NEW.gm_approved_by
      WHEN 'director_approved' THEN NEW.director_approved_by
      WHEN 'hr_approved' THEN NEW.hr_approved_by
      WHEN 'rejected' THEN NEW.rejected_by
      WHEN 'cancelled' THEN coalesce(NEW.cancelled_by, NEW.cancellation_final_approved_by)
      WHEN 'pending' THEN CASE WHEN NEW.amended_at IS NOT NULL THEN NEW.employee_id ELSE NULL END
      ELSE NULL
    END;

    actor_role_value := CASE NEW.status
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      WHEN 'director_approved' THEN 'director'
      WHEN 'hr_approved' THEN 'hr'
      WHEN 'cancelled' THEN coalesce(NEW.cancelled_by_role, NEW.cancellation_final_approved_by_role)
      WHEN 'pending' THEN CASE WHEN NEW.amended_at IS NOT NULL THEN 'employee'::public.app_role ELSE NULL END
      ELSE NULL
    END;

    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      from_cancellation_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.status = 'pending' AND OLD.status = 'rejected' AND NEW.amended_at IS NOT NULL THEN 'leave_resubmitted'
        ELSE 'leave_status_changed'
      END,
      coalesce(NEW.updated_at, now()),
      actor_id,
      actor_role_value,
      OLD.status,
      NEW.status,
      OLD.cancellation_status,
      NEW.cancellation_status,
      jsonb_build_object(
        'approval_route_snapshot', coalesce(to_jsonb(NEW.approval_route_snapshot), 'null'::jsonb)
      )
    );
  END IF;

  IF NEW.rejected_at IS NOT NULL AND (OLD.rejected_at IS NULL OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_rejected',
      NEW.rejected_at,
      NEW.rejected_by,
      OLD.status,
      NEW.status,
      jsonb_build_object('rejection_reason', NEW.rejection_reason)
    );
  END IF;

  IF NEW.final_approved_at IS NOT NULL AND (OLD.final_approved_at IS NULL OR NEW.final_approved_at IS DISTINCT FROM OLD.final_approved_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_final_approved',
      NEW.final_approved_at,
      NEW.final_approved_by,
      NEW.final_approved_by_role,
      OLD.status,
      NEW.status,
      jsonb_build_object('final_approved_by_role', NEW.final_approved_by_role)
    );
  END IF;

  IF NEW.amended_at IS NOT NULL AND (OLD.amended_at IS NULL OR NEW.amended_at IS DISTINCT FROM OLD.amended_at) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_amended',
      NEW.amended_at,
      NEW.employee_id,
      'employee',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'amendment_notes', NEW.amendment_notes,
        'document_attached', NEW.document_url IS NOT NULL
      )
    );
  END IF;

  IF coalesce(OLD.document_required, false) = false AND coalesce(NEW.document_required, false) = true THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_document_requested',
      coalesce(NEW.updated_at, now()),
      NULL,
      OLD.status,
      NEW.status,
      jsonb_build_object('manager_comments', NEW.manager_comments)
    );
  END IF;

  IF NEW.document_url IS NOT NULL AND (OLD.document_url IS NULL OR NEW.document_url IS DISTINCT FROM OLD.document_url) THEN
    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      metadata
    )
    VALUES (
      NEW.id,
      'leave_document_attached',
      coalesce(NEW.updated_at, now()),
      NEW.employee_id,
      'employee',
      OLD.status,
      NEW.status,
      jsonb_build_object('document_required', NEW.document_required)
    );
  END IF;

  IF NEW.cancellation_status IS DISTINCT FROM OLD.cancellation_status THEN
    actor_id := CASE NEW.cancellation_status
      WHEN 'pending' THEN NEW.cancellation_requested_by
      WHEN 'manager_approved' THEN NEW.cancellation_manager_approved_by
      WHEN 'gm_approved' THEN NEW.cancellation_gm_approved_by
      WHEN 'director_approved' THEN NEW.cancellation_director_approved_by
      WHEN 'approved' THEN NEW.cancellation_final_approved_by
      WHEN 'rejected' THEN NEW.cancellation_rejected_by
      ELSE NULL
    END;

    actor_role_value := CASE NEW.cancellation_status
      WHEN 'pending' THEN 'employee'
      WHEN 'manager_approved' THEN 'manager'
      WHEN 'gm_approved' THEN 'general_manager'
      WHEN 'director_approved' THEN 'director'
      WHEN 'approved' THEN NEW.cancellation_final_approved_by_role
      ELSE NULL
    END;

    INSERT INTO public.leave_request_events (
      leave_request_id,
      event_type,
      occurred_at,
      actor_user_id,
      actor_role,
      from_status,
      to_status,
      from_cancellation_status,
      to_cancellation_status,
      metadata
    )
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.cancellation_status = 'pending' THEN
          CASE WHEN OLD.cancellation_status = 'rejected' THEN 'leave_cancellation_re_requested' ELSE 'leave_cancellation_requested' END
        WHEN NEW.cancellation_status = 'approved' THEN 'leave_cancellation_approved'
        WHEN NEW.cancellation_status = 'rejected' THEN 'leave_cancellation_rejected'
        WHEN NEW.cancellation_status IN ('manager_approved', 'gm_approved', 'director_approved') THEN 'leave_cancellation_stage_approved'
        ELSE 'leave_cancellation_status_changed'
      END,
      coalesce(
        CASE
          WHEN NEW.cancellation_status = 'pending' THEN NEW.cancellation_requested_at
          WHEN NEW.cancellation_status = 'approved' THEN NEW.cancellation_final_approved_at
          WHEN NEW.cancellation_status = 'rejected' THEN NEW.cancellation_rejected_at
          WHEN NEW.cancellation_status = 'manager_approved' THEN NEW.cancellation_manager_approved_at
          WHEN NEW.cancellation_status = 'gm_approved' THEN NEW.cancellation_gm_approved_at
          WHEN NEW.cancellation_status = 'director_approved' THEN NEW.cancellation_director_approved_at
          ELSE NULL
        END,
        coalesce(NEW.updated_at, now())
      ),
      actor_id,
      actor_role_value,
      OLD.status,
      NEW.status,
      OLD.cancellation_status,
      NEW.cancellation_status,
      jsonb_build_object(
        'cancellation_route_snapshot', coalesce(to_jsonb(NEW.cancellation_route_snapshot), 'null'::jsonb),
        'cancellation_reason', NEW.cancellation_reason,
        'cancellation_rejection_reason', NEW.cancellation_rejection_reason
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: log_workflow_config_events(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_workflow_config_events() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: mark_user_notifications_read(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_user_notifications_read(_notification_ids uuid[] DEFAULT NULL::uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: mark_user_notifications_unread(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_user_notifications_unread(_notification_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF _notification_ids IS NULL OR coalesce(array_length(_notification_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Notification IDs are required.';
  END IF;

  UPDATE public.user_notifications n
  SET read_at = NULL
  WHERE n.user_id = v_user_id
    AND n.id = ANY (_notification_ids)
    AND n.read_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: next_leave_stage_from_route(text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_leave_stage_from_route(_route text[], _current_stage text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
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


--
-- Name: normalize_leave_request_resubmission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_leave_request_resubmission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  is_amendment_update boolean := false;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Treat any pending-row amendment timestamp change as a resubmission/amendment cycle.
  is_amendment_update := (
    NEW.status = 'pending'
    AND NEW.amended_at IS NOT NULL
    AND (
      NEW.amended_at IS DISTINCT FROM OLD.amended_at
      OR NEW.amendment_notes IS DISTINCT FROM OLD.amendment_notes
      OR NEW.reason IS DISTINCT FROM OLD.reason
      OR NEW.document_url IS DISTINCT FROM OLD.document_url
    )
  );

  IF NOT is_amendment_update THEN
    RETURN NEW;
  END IF;

  -- Resubmissions restart the approval lifecycle. Clear stale approval/rejection/final/cancellation state.
  NEW.manager_approved_at := NULL;
  NEW.manager_approved_by := NULL;
  NEW.gm_approved_at := NULL;
  NEW.gm_approved_by := NULL;
  NEW.director_approved_at := NULL;
  NEW.director_approved_by := NULL;
  NEW.hr_approved_at := NULL;
  NEW.hr_approved_by := NULL;
  NEW.hr_notified_at := NULL;
  NEW.rejected_at := NULL;
  NEW.rejected_by := NULL;
  NEW.rejection_reason := NULL;
  NEW.final_approved_at := NULL;
  NEW.final_approved_by := NULL;
  NEW.final_approved_by_role := NULL;

  NEW.cancellation_status := NULL;
  NEW.cancellation_route_snapshot := NULL;
  NEW.cancellation_requested_at := NULL;
  NEW.cancellation_requested_by := NULL;
  NEW.cancellation_reason := NULL;
  NEW.cancellation_comments := NULL;
  NEW.cancellation_manager_approved_at := NULL;
  NEW.cancellation_manager_approved_by := NULL;
  NEW.cancellation_gm_approved_at := NULL;
  NEW.cancellation_gm_approved_by := NULL;
  NEW.cancellation_director_approved_at := NULL;
  NEW.cancellation_director_approved_by := NULL;
  NEW.cancellation_final_approved_at := NULL;
  NEW.cancellation_final_approved_by := NULL;
  NEW.cancellation_final_approved_by_role := NULL;
  NEW.cancellation_rejected_at := NULL;
  NEW.cancellation_rejected_by := NULL;
  NEW.cancellation_rejection_reason := NULL;
  NEW.cancelled_at := NULL;
  NEW.cancelled_by := NULL;
  NEW.cancelled_by_role := NULL;

  -- If the amendment included a document upload, clear the manager document request flag.
  IF NEW.document_url IS NOT NULL THEN
    NEW.document_required := false;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: normalize_leave_request_state(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_leave_request_state() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  canonical_stages text[] := ARRAY['manager', 'general_manager', 'director']::text[];
  normalized_approval_route text[] := NULL;
  normalized_cancellation_route text[] := NULL;
BEGIN
  -- Trim optional text fields and normalize empty strings to NULL.
  IF NEW.reason IS NOT NULL THEN
    NEW.reason := btrim(NEW.reason);
  END IF;
  NEW.document_url := NULLIF(btrim(coalesce(NEW.document_url, '')), '');
  NEW.manager_comments := NULLIF(btrim(coalesce(NEW.manager_comments, '')), '');
  NEW.amendment_notes := NULLIF(btrim(coalesce(NEW.amendment_notes, '')), '');
  NEW.rejection_reason := NULLIF(btrim(coalesce(NEW.rejection_reason, '')), '');
  NEW.cancellation_reason := NULLIF(btrim(coalesce(NEW.cancellation_reason, '')), '');
  NEW.cancellation_comments := NULLIF(btrim(coalesce(NEW.cancellation_comments, '')), '');
  NEW.cancellation_rejection_reason := NULLIF(btrim(coalesce(NEW.cancellation_rejection_reason, '')), '');

  -- Canonicalize route snapshots (valid stages only, unique, fixed order).
  normalized_approval_route := ARRAY(
    SELECT stage
    FROM unnest(canonical_stages) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]))
  );
  NEW.approval_route_snapshot := CASE
    WHEN coalesce(array_length(normalized_approval_route, 1), 0) = 0 THEN NULL
    ELSE normalized_approval_route
  END;

  normalized_cancellation_route := ARRAY(
    SELECT stage
    FROM unnest(canonical_stages) AS stage
    WHERE stage = ANY(coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]))
  );
  NEW.cancellation_route_snapshot := CASE
    WHEN coalesce(array_length(normalized_cancellation_route, 1), 0) = 0 THEN NULL
    ELSE normalized_cancellation_route
  END;

  -- Normalize legacy "approved then cancelled" rows into explicit cancellation workflow completion.
  IF NEW.status = 'cancelled'
     AND NEW.final_approved_at IS NOT NULL
     AND NEW.cancellation_status IS NULL
     AND NEW.cancelled_at IS NOT NULL
     AND NEW.cancelled_by IS NOT NULL
     AND NEW.cancelled_by_role IS NOT NULL
  THEN
    NEW.cancellation_status := 'approved';
    NEW.cancellation_route_snapshot := coalesce(NEW.cancellation_route_snapshot, NEW.approval_route_snapshot);
    NEW.cancellation_requested_at := coalesce(NEW.cancellation_requested_at, NEW.cancelled_at);
    NEW.cancellation_requested_by := coalesce(NEW.cancellation_requested_by, NEW.employee_id);
    NEW.cancellation_final_approved_at := coalesce(NEW.cancellation_final_approved_at, NEW.cancelled_at);
    NEW.cancellation_final_approved_by := coalesce(NEW.cancellation_final_approved_by, NEW.cancelled_by);
    NEW.cancellation_final_approved_by_role := coalesce(NEW.cancellation_final_approved_by_role, NEW.cancelled_by_role);

    -- Backfill stage-specific cancellation approval stamps for legacy rows so route-aware invariants can pass.
    CASE coalesce(NEW.cancellation_final_approved_by_role::text, NEW.cancelled_by_role::text)
      WHEN 'manager' THEN
        NEW.cancellation_manager_approved_at := coalesce(NEW.cancellation_manager_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_manager_approved_by := coalesce(NEW.cancellation_manager_approved_by, NEW.cancellation_final_approved_by);
      WHEN 'general_manager' THEN
        NEW.cancellation_gm_approved_at := coalesce(NEW.cancellation_gm_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_gm_approved_by := coalesce(NEW.cancellation_gm_approved_by, NEW.cancellation_final_approved_by);
      WHEN 'director' THEN
        NEW.cancellation_director_approved_at := coalesce(NEW.cancellation_director_approved_at, NEW.cancellation_final_approved_at);
        NEW.cancellation_director_approved_by := coalesce(NEW.cancellation_director_approved_by, NEW.cancellation_final_approved_by);
      ELSE
        NULL;
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: normalize_username(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_username(_value text) RETURNS text
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'pg_catalog'
    AS $_$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(coalesce(_value, '')), '[^a-z0-9._-]+', '', 'g'),
      '^[._-]+|[._-]+$',
      '',
      'g'
    ),
    ''
  );
$_$;


--
-- Name: notification_delivery_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_delivery_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    channel text DEFAULT 'email'::text NOT NULL,
    category text NOT NULL,
    event_type text NOT NULL,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    body_text text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    leased_at timestamp with time zone,
    leased_by text,
    sent_at timestamp with time zone,
    failed_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_provider text,
    CONSTRAINT notification_delivery_queue_attempts_check CHECK ((attempts >= 0)),
    CONSTRAINT notification_delivery_queue_channel_check CHECK ((channel = 'email'::text)),
    CONSTRAINT notification_delivery_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text, 'discarded'::text])))
);


--
-- Name: notification_admin_discard_email_queue_item(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_discard_email_queue_item(_queue_id uuid, _reason text DEFAULT NULL::text) RETURNS public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_admin_email_dead_letter_analytics(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_email_dead_letter_analytics(_window_hours integer DEFAULT 24, _limit integer DEFAULT 8) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_admin_email_queue_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_email_queue_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_admin_email_worker_run_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_email_worker_run_summary() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_admin_list_email_queue(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_list_email_queue(_status text DEFAULT 'all'::text, _limit integer DEFAULT 25, _offset integer DEFAULT 0) RETURNS SETOF public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_email_worker_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_email_worker_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    worker_id text NOT NULL,
    provider text NOT NULL,
    run_status text DEFAULT 'running'::text NOT NULL,
    request_batch_size integer DEFAULT 25 NOT NULL,
    request_lease_seconds integer DEFAULT 300 NOT NULL,
    request_retry_delay_seconds integer DEFAULT 300 NOT NULL,
    request_max_attempts integer DEFAULT 5 NOT NULL,
    claimed_count integer DEFAULT 0 NOT NULL,
    processed_count integer DEFAULT 0 NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    discarded_count integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    error_message text,
    request_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notification_email_worker_run_request_retry_delay_seconds_check CHECK ((request_retry_delay_seconds >= 0)),
    CONSTRAINT notification_email_worker_runs_claimed_count_check CHECK ((claimed_count >= 0)),
    CONSTRAINT notification_email_worker_runs_discarded_count_check CHECK ((discarded_count >= 0)),
    CONSTRAINT notification_email_worker_runs_duration_ms_check CHECK (((duration_ms IS NULL) OR (duration_ms >= 0))),
    CONSTRAINT notification_email_worker_runs_failed_count_check CHECK ((failed_count >= 0)),
    CONSTRAINT notification_email_worker_runs_processed_count_check CHECK ((processed_count >= 0)),
    CONSTRAINT notification_email_worker_runs_request_batch_size_check CHECK ((request_batch_size >= 1)),
    CONSTRAINT notification_email_worker_runs_request_lease_seconds_check CHECK ((request_lease_seconds >= 1)),
    CONSTRAINT notification_email_worker_runs_request_max_attempts_check CHECK ((request_max_attempts >= 1)),
    CONSTRAINT notification_email_worker_runs_run_status_check CHECK ((run_status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text]))),
    CONSTRAINT notification_email_worker_runs_sent_count_check CHECK ((sent_count >= 0))
);


--
-- Name: notification_admin_list_email_worker_runs(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_list_email_worker_runs(_status text DEFAULT 'all'::text, _limit integer DEFAULT 20, _offset integer DEFAULT 0) RETURNS SETOF public.notification_email_worker_runs
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_admin_requeue_email_queue_item(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_admin_requeue_email_queue_item(_queue_id uuid, _delay_seconds integer DEFAULT 0) RETURNS public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_category_enabled(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_category_enabled(_user_id uuid, _category text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
  SELECT CASE lower(coalesce(_category, 'system'))
    WHEN 'leave' THEN coalesce(p.leave_enabled, true)
    WHEN 'admin' THEN coalesce(p.admin_enabled, true)
    WHEN 'system' THEN coalesce(p.system_enabled, true)
    ELSE true
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.user_notification_preferences p
    ON p.user_id = _user_id;
$$;


--
-- Name: notification_email_category_enabled(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_email_category_enabled(_user_id uuid, _category text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
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


--
-- Name: notification_worker_claim_email_queue(integer, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_worker_claim_email_queue(_batch_size integer DEFAULT 20, _worker_id text DEFAULT NULL::text, _lease_seconds integer DEFAULT 300, _max_attempts integer DEFAULT 10) RETURNS SETOF public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_worker_finalize_email_queue_item(uuid, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_worker_finalize_email_queue_item(_queue_id uuid, _outcome text, _worker_id text DEFAULT NULL::text, _error text DEFAULT NULL::text, _retry_delay_seconds integer DEFAULT 300) RETURNS public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_worker_finalize_email_queue_item_v2(uuid, text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_worker_finalize_email_queue_item_v2(_queue_id uuid, _outcome text, _worker_id text DEFAULT NULL::text, _provider text DEFAULT NULL::text, _error text DEFAULT NULL::text, _retry_delay_seconds integer DEFAULT 300) RETURNS public.notification_delivery_queue
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_worker_finish_email_run(uuid, integer, integer, integer, integer, integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_worker_finish_email_run(_run_id uuid, _claimed_count integer DEFAULT 0, _processed_count integer DEFAULT 0, _sent_count integer DEFAULT 0, _failed_count integer DEFAULT 0, _discarded_count integer DEFAULT 0, _duration_ms integer DEFAULT NULL::integer, _error text DEFAULT NULL::text) RETURNS public.notification_email_worker_runs
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: notification_worker_start_email_run(text, text, integer, integer, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notification_worker_start_email_run(_worker_id text, _provider text, _batch_size integer DEFAULT 25, _lease_seconds integer DEFAULT 300, _retry_delay_seconds integer DEFAULT 300, _max_attempts integer DEFAULT 5, _request_payload jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: request_leave_cancellation(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_leave_cancellation(_request_id uuid, _reason text DEFAULT NULL::text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  requester_role_value public.app_role := 'employee';
  employee_department_id UUID;
  raw_route TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
  now_ts TIMESTAMPTZ := now();
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN 'already_cancelled';
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NULL THEN
    IF request_row.status <> 'pending' THEN
      RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancelled_at = now_ts,
        cancelled_by = requester_id,
        cancelled_by_role = COALESCE(public.get_user_role(requester_id), 'employee'::public.app_role),
        cancellation_status = NULL,
        cancellation_route_snapshot = NULL,
        cancellation_requested_at = NULL,
        cancellation_requested_by = NULL,
        cancellation_reason = NULL,
        cancellation_comments = NULL,
        cancellation_manager_approved_at = NULL,
        cancellation_manager_approved_by = NULL,
        cancellation_gm_approved_at = NULL,
        cancellation_gm_approved_by = NULL,
        cancellation_director_approved_at = NULL,
        cancellation_director_approved_by = NULL,
        cancellation_final_approved_at = NULL,
        cancellation_final_approved_by = NULL,
        cancellation_final_approved_by_role = NULL,
        cancellation_rejected_at = NULL,
        cancellation_rejected_by = NULL,
        cancellation_rejection_reason = NULL
    WHERE id = _request_id;

    RETURN 'cancelled';
  END IF;

  IF request_row.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
    RAISE EXCEPTION 'A cancellation request is already in progress'
      USING ERRCODE = '23505';
  END IF;

  requester_role_value := COALESCE(public.get_user_role(request_row.employee_id), 'employee'::public.app_role);

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = request_row.employee_id;

  SELECT w.approval_stages
  INTO raw_route
  FROM public.leave_cancellation_workflows w
  WHERE w.requester_role = 'employee'::public.app_role
    AND w.is_active = true
    AND (
      w.department_id IS NULL
      OR w.department_id = employee_department_id
    )
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF raw_route IS NULL OR coalesce(array_length(raw_route, 1), 0) = 0 THEN
    raw_route := ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  IF 'manager' = ANY(raw_route)
     AND requester_role_value NOT IN ('manager'::public.app_role, 'general_manager'::public.app_role, 'director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(raw_route)
     AND requester_role_value NOT IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(raw_route) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    IF requester_role_value IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
      route := ARRAY['director']::TEXT[];
    ELSIF requester_role_value IN ('manager'::public.app_role, 'general_manager'::public.app_role) THEN
      route := ARRAY['general_manager', 'director']::TEXT[];
    ELSE
      route := ARRAY['manager', 'general_manager', 'director']::TEXT[];
    END IF;
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = route,
      cancellation_requested_at = now_ts,
      cancellation_requested_by = requester_id,
      cancellation_reason = NULLIF(btrim(_reason), ''),
      cancellation_comments = NULL,
      cancellation_manager_approved_at = NULL,
      cancellation_manager_approved_by = NULL,
      cancellation_gm_approved_at = NULL,
      cancellation_gm_approved_by = NULL,
      cancellation_director_approved_at = NULL,
      cancellation_director_approved_by = NULL,
      cancellation_final_approved_at = NULL,
      cancellation_final_approved_by = NULL,
      cancellation_final_approved_by_role = NULL,
      cancellation_rejected_at = NULL,
      cancellation_rejected_by = NULL,
      cancellation_rejection_reason = NULL
  WHERE id = _request_id;

  RETURN 'requested';
END;
$$;


--
-- Name: request_user_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
  SELECT auth.uid();
$$;


--
-- Name: resolve_leave_request_workflow_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id uuid) RETURNS text[]
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  resolved_requester_role public.app_role := 'employee'::public.app_role;
  employee_department_id UUID;
  configured_workflow TEXT[];
  route TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF _employee_id IS NULL THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  SELECT COALESCE(public.get_user_role(_employee_id), 'employee'::public.app_role)
  INTO resolved_requester_role;

  SELECT p.department_id
  INTO employee_department_id
  FROM public.profiles p
  WHERE p.id = _employee_id;

  SELECT w.approval_stages
  INTO configured_workflow
  FROM public.leave_approval_workflows w
  WHERE w.requester_role = 'employee'::public.app_role
    AND w.is_active = true
    AND (w.department_id IS NULL OR w.department_id = employee_department_id)
  ORDER BY
    CASE
      WHEN employee_department_id IS NOT NULL AND w.department_id = employee_department_id THEN 0
      ELSE 1
    END,
    w.created_at ASC
  LIMIT 1;

  IF configured_workflow IS NULL OR coalesce(array_length(configured_workflow, 1), 0) = 0 THEN
    configured_workflow := ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  IF 'manager' = ANY(configured_workflow)
     AND resolved_requester_role NOT IN ('manager'::public.app_role, 'general_manager'::public.app_role, 'director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(configured_workflow)
     AND resolved_requester_role NOT IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(configured_workflow) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    IF resolved_requester_role IN ('director'::public.app_role, 'hr'::public.app_role, 'admin'::public.app_role) THEN
      RETURN ARRAY['director']::TEXT[];
    ELSIF resolved_requester_role IN ('manager'::public.app_role, 'general_manager'::public.app_role) THEN
      RETURN ARRAY['general_manager', 'director']::TEXT[];
    END IF;

    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  END IF;

  RETURN route;
END;
$$;


--
-- Name: resolve_login_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_login_email(_identifier text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  normalized_identifier TEXT;
  resolved_email TEXT;
BEGIN
  normalized_identifier := lower(trim(coalesce(_identifier, '')));

  IF normalized_identifier = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.email
  INTO resolved_email
  FROM public.profiles p
  WHERE lower(p.username) = normalized_identifier
     OR lower(coalesce(p.employee_id, '')) = normalized_identifier
     OR lower(p.email) = normalized_identifier
  LIMIT 1;

  RETURN resolved_email;
END;
$$;


--
-- Name: run_notification_retention_job(integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_notification_retention_job(_read_notifications_days integer DEFAULT 180, _sent_queue_days integer DEFAULT 30, _failed_queue_days integer DEFAULT 90) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: set_leave_request_workflow_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_leave_request_workflow_snapshot() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  normalized_stages TEXT[];
BEGIN
  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::TEXT[]))
  );

  IF coalesce(array_length(normalized_stages, 1), 0) = 0 THEN
    NEW.approval_route_snapshot := public.resolve_leave_request_workflow_snapshot(NEW.employee_id);
  ELSE
    NEW.approval_route_snapshot := normalized_stages;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_profile_username(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_profile_username() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := coalesce(
    nullif(trim(NEW.username), ''),
    nullif(trim(NEW.employee_id), ''),
    split_part(coalesce(NEW.email, ''), '@', 1),
    split_part(NEW.id::TEXT, '-', 1)
  );

  NEW.username := public.generate_unique_username(base_username, NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: suppress_muted_user_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.suppress_muted_user_notifications() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notification_category_enabled(NEW.user_id, NEW.category) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_leave_approval_workflow_stages(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_leave_approval_workflow_stages() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  canonical_order TEXT[] := ARRAY['manager', 'general_manager', 'director'];
  normalized_stages TEXT[];
  input_count INTEGER;
  normalized_count INTEGER;
BEGIN
  input_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF input_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(canonical_order) AS stage
    WHERE stage = ANY(coalesce(NEW.approval_stages, ARRAY[]::TEXT[]))
  );

  normalized_count := coalesce(array_length(normalized_stages, 1), 0);

  IF normalized_count <> input_count OR NEW.approval_stages IS DISTINCT FROM normalized_stages THEN
    RAISE EXCEPTION 'approval_stages must be a unique canonical subset of (manager, general_manager, director)'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_leave_cancellation_workflow_stages(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_leave_cancellation_workflow_stages() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director') THEN
      RAISE EXCEPTION 'Invalid cancellation approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate cancellation approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  RETURN NEW;
END;
$$;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'normal'::text,
    published_by uuid,
    published_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT announcements_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    clock_in timestamp with time zone,
    clock_out timestamp with time zone,
    status text DEFAULT 'present'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'half_day'::text, 'on_leave'::text])))
);


--
-- Name: deduction_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deduction_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    deduction_type public.deduction_type DEFAULT 'fixed'::public.deduction_type NOT NULL,
    default_value numeric(12,2) DEFAULT 0,
    is_mandatory boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: department_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.department_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    end_date date,
    event_type text DEFAULT 'meeting'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    category public.document_category DEFAULT 'other'::public.document_category NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employee_deductions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_deductions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    deduction_type_id uuid NOT NULL,
    amount numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    date date NOT NULL,
    description text,
    is_recurring boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leave_approval_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_approval_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_role public.app_role NOT NULL,
    approval_stages text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id uuid
);


--
-- Name: leave_cancellation_workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_cancellation_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_role public.app_role NOT NULL,
    approval_stages text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    department_id uuid
);


--
-- Name: leave_request_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_request_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    leave_request_id uuid NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid,
    actor_role public.app_role,
    from_status text,
    to_status text,
    from_cancellation_status text,
    to_cancellation_status text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leave_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    days_allowed integer DEFAULT 0 NOT NULL,
    is_paid boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    min_days integer DEFAULT 1,
    requires_document boolean DEFAULT false
);


--
-- Name: payroll_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_periods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    payment_date date,
    status public.payroll_status DEFAULT 'draft'::public.payroll_status,
    created_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payslips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payslips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payroll_period_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    basic_salary numeric(12,2) DEFAULT 0 NOT NULL,
    total_allowances numeric(12,2) DEFAULT 0,
    total_deductions numeric(12,2) DEFAULT 0,
    gross_salary numeric(12,2) DEFAULT 0 NOT NULL,
    net_salary numeric(12,2) DEFAULT 0 NOT NULL,
    working_days integer DEFAULT 0,
    days_worked integer DEFAULT 0,
    days_absent integer DEFAULT 0,
    days_leave integer DEFAULT 0,
    overtime_hours numeric(5,2) DEFAULT 0,
    overtime_amount numeric(12,2) DEFAULT 0,
    deductions_breakdown jsonb DEFAULT '{}'::jsonb,
    allowances_breakdown jsonb DEFAULT '{}'::jsonb,
    status public.payslip_status DEFAULT 'pending'::public.payslip_status,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: performance_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    review_period text NOT NULL,
    overall_rating integer,
    strengths text,
    areas_for_improvement text,
    goals text,
    comments text,
    status text DEFAULT 'draft'::text,
    submitted_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT performance_reviews_overall_rating_check CHECK (((overall_rating >= 1) AND (overall_rating <= 5))),
    CONSTRAINT performance_reviews_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'acknowledged'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    employee_id text,
    email text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text,
    avatar_url text,
    department_id uuid,
    job_title text,
    hire_date date,
    manager_id uuid,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    username text NOT NULL,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'on_leave'::text, 'terminated'::text])))
);


--
-- Name: salary_structures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.salary_structures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    basic_salary numeric(12,2) DEFAULT 0 NOT NULL,
    housing_allowance numeric(12,2) DEFAULT 0,
    transport_allowance numeric(12,2) DEFAULT 0,
    meal_allowance numeric(12,2) DEFAULT 0,
    other_allowances numeric(12,2) DEFAULT 0,
    effective_date date DEFAULT CURRENT_DATE NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: training_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    program_id uuid NOT NULL,
    status text DEFAULT 'enrolled'::text,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    score integer,
    CONSTRAINT training_enrollments_status_check CHECK ((status = ANY (ARRAY['enrolled'::text, 'in_progress'::text, 'completed'::text, 'dropped'::text])))
);


--
-- Name: training_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.training_programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    category text,
    duration_hours integer,
    is_mandatory boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    user_id uuid NOT NULL,
    leave_enabled boolean DEFAULT true NOT NULL,
    admin_enabled boolean DEFAULT true NOT NULL,
    system_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email_leave_enabled boolean DEFAULT false NOT NULL,
    email_admin_enabled boolean DEFAULT false NOT NULL,
    email_system_enabled boolean DEFAULT false NOT NULL
);


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    category text DEFAULT 'system'::text NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    source_table text,
    source_id uuid,
    leave_request_id uuid,
    leave_request_event_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workflow_config_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_config_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_type text NOT NULL,
    action text NOT NULL,
    workflow_table text NOT NULL,
    workflow_row_id uuid NOT NULL,
    requester_role public.app_role NOT NULL,
    department_id uuid,
    changed_by_user_id uuid,
    changed_by_role public.app_role,
    old_values jsonb,
    new_values jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workflow_config_events_action_check CHECK ((action = ANY (ARRAY['created'::text, 'updated'::text, 'deleted'::text]))),
    CONSTRAINT workflow_config_events_workflow_table_check CHECK ((workflow_table = ANY (ARRAY['leave_approval_workflows'::text, 'leave_cancellation_workflows'::text]))),
    CONSTRAINT workflow_config_events_workflow_type_check CHECK ((workflow_type = ANY (ARRAY['leave_approval'::text, 'leave_cancellation'::text])))
);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_employee_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_date_key UNIQUE (employee_id, date);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: deduction_types deduction_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deduction_types
    ADD CONSTRAINT deduction_types_pkey PRIMARY KEY (id);


--
-- Name: department_events department_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_events
    ADD CONSTRAINT department_events_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employee_deductions employee_deductions_employee_id_deduction_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT employee_deductions_employee_id_deduction_type_id_key UNIQUE (employee_id, deduction_type_id);


--
-- Name: employee_deductions employee_deductions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT employee_deductions_pkey PRIMARY KEY (id);


--
-- Name: holidays holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_pkey PRIMARY KEY (id);


--
-- Name: leave_approval_workflows leave_approval_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_approval_workflows
    ADD CONSTRAINT leave_approval_workflows_pkey PRIMARY KEY (id);


--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_cancellation_workflows
    ADD CONSTRAINT leave_cancellation_workflows_pkey PRIMARY KEY (id);


--
-- Name: leave_request_events leave_request_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_request_events
    ADD CONSTRAINT leave_request_events_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: leave_types leave_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_name_key UNIQUE (name);


--
-- Name: leave_types leave_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_types
    ADD CONSTRAINT leave_types_pkey PRIMARY KEY (id);


--
-- Name: notification_delivery_queue notification_delivery_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_queue
    ADD CONSTRAINT notification_delivery_queue_pkey PRIMARY KEY (id);


--
-- Name: notification_email_worker_runs notification_email_worker_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_email_worker_runs
    ADD CONSTRAINT notification_email_worker_runs_pkey PRIMARY KEY (id);


--
-- Name: payroll_periods payroll_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_pkey PRIMARY KEY (id);


--
-- Name: payslips payslips_payroll_period_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_payroll_period_id_employee_id_key UNIQUE (payroll_period_id, employee_id);


--
-- Name: payslips payslips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_pkey PRIMARY KEY (id);


--
-- Name: performance_reviews performance_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_employee_id_key UNIQUE (employee_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: salary_structures salary_structures_employee_id_effective_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_employee_id_effective_date_key UNIQUE (employee_id, effective_date);


--
-- Name: salary_structures salary_structures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_pkey PRIMARY KEY (id);


--
-- Name: training_enrollments training_enrollments_employee_id_program_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_employee_id_program_id_key UNIQUE (employee_id, program_id);


--
-- Name: training_enrollments training_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_pkey PRIMARY KEY (id);


--
-- Name: training_programs training_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT training_programs_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: workflow_config_events workflow_config_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_config_events
    ADD CONSTRAINT workflow_config_events_pkey PRIMARY KEY (id);


--
-- Name: idx_announcements_published_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_published_by ON public.announcements USING btree (published_by);


--
-- Name: idx_department_events_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_department_events_created_by ON public.department_events USING btree (created_by);


--
-- Name: idx_department_events_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_department_events_department_id ON public.department_events USING btree (department_id);


--
-- Name: idx_departments_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_departments_manager_id ON public.departments USING btree (manager_id);


--
-- Name: idx_documents_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_employee_id ON public.documents USING btree (employee_id);


--
-- Name: idx_documents_uploaded_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_uploaded_by ON public.documents USING btree (uploaded_by);


--
-- Name: idx_employee_deductions_deduction_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_deductions_deduction_type_id ON public.employee_deductions USING btree (deduction_type_id);


--
-- Name: idx_holidays_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holidays_created_by ON public.holidays USING btree (created_by);


--
-- Name: idx_leave_approval_workflows_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_approval_workflows_department_id ON public.leave_approval_workflows USING btree (department_id);


--
-- Name: idx_leave_cancellation_workflows_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_cancellation_workflows_department_id ON public.leave_cancellation_workflows USING btree (department_id);


--
-- Name: idx_leave_request_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_request_events_event_type ON public.leave_request_events USING btree (event_type);


--
-- Name: idx_leave_request_events_leave_request_id_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_request_events_leave_request_id_occurred_at ON public.leave_request_events USING btree (leave_request_id, occurred_at DESC);


--
-- Name: idx_leave_requests_cancellation_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_cancellation_requested_at ON public.leave_requests USING btree (cancellation_requested_at);


--
-- Name: idx_leave_requests_cancellation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_cancellation_status ON public.leave_requests USING btree (cancellation_status);


--
-- Name: idx_leave_requests_director_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_director_approved_by ON public.leave_requests USING btree (director_approved_by);


--
-- Name: idx_leave_requests_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests USING btree (employee_id);


--
-- Name: idx_leave_requests_final_approved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_final_approved_at ON public.leave_requests USING btree (final_approved_at);


--
-- Name: idx_leave_requests_final_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_final_approved_by ON public.leave_requests USING btree (final_approved_by);


--
-- Name: idx_leave_requests_gm_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_gm_approved_by ON public.leave_requests USING btree (gm_approved_by);


--
-- Name: idx_leave_requests_hr_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_hr_approved_by ON public.leave_requests USING btree (hr_approved_by);


--
-- Name: idx_leave_requests_leave_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_leave_type_id ON public.leave_requests USING btree (leave_type_id);


--
-- Name: idx_leave_requests_manager_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_manager_approved_by ON public.leave_requests USING btree (manager_approved_by);


--
-- Name: idx_leave_requests_rejected_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leave_requests_rejected_by ON public.leave_requests USING btree (rejected_by);


--
-- Name: idx_notification_delivery_queue_dead_letter_analytics; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_delivery_queue_dead_letter_analytics ON public.notification_delivery_queue USING btree (status, failed_at DESC, event_type, last_provider) WHERE ((channel = 'email'::text) AND (status = ANY (ARRAY['failed'::text, 'discarded'::text])));


--
-- Name: idx_notification_delivery_queue_status_next_attempt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_delivery_queue_status_next_attempt ON public.notification_delivery_queue USING btree (status, next_attempt_at, created_at);


--
-- Name: idx_notification_delivery_queue_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_delivery_queue_user_created ON public.notification_delivery_queue USING btree (user_id, created_at DESC);


--
-- Name: idx_notification_email_worker_runs_provider_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_email_worker_runs_provider_started_at ON public.notification_email_worker_runs USING btree (provider, started_at DESC);


--
-- Name: idx_notification_email_worker_runs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_email_worker_runs_started_at ON public.notification_email_worker_runs USING btree (started_at DESC);


--
-- Name: idx_notification_email_worker_runs_status_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_email_worker_runs_status_started_at ON public.notification_email_worker_runs USING btree (run_status, started_at DESC);


--
-- Name: idx_payroll_periods_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_periods_created_by ON public.payroll_periods USING btree (created_by);


--
-- Name: idx_payslips_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payslips_employee_id ON public.payslips USING btree (employee_id);


--
-- Name: idx_performance_reviews_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_reviews_employee_id ON public.performance_reviews USING btree (employee_id);


--
-- Name: idx_performance_reviews_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_reviews_reviewer_id ON public.performance_reviews USING btree (reviewer_id);


--
-- Name: idx_profiles_department_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_department_id ON public.profiles USING btree (department_id);


--
-- Name: idx_profiles_manager_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_manager_id ON public.profiles USING btree (manager_id);


--
-- Name: idx_training_enrollments_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_enrollments_program_id ON public.training_enrollments USING btree (program_id);


--
-- Name: idx_training_programs_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_training_programs_created_by ON public.training_programs USING btree (created_by);


--
-- Name: idx_user_notifications_leave_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_leave_request ON public.user_notifications USING btree (leave_request_id, created_at DESC);


--
-- Name: idx_user_notifications_user_category_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_category_created ON public.user_notifications USING btree (user_id, category, created_at DESC);


--
-- Name: idx_user_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_created ON public.user_notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_user_notifications_user_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_notifications_user_event_unique ON public.user_notifications USING btree (user_id, leave_request_event_id);


--
-- Name: idx_user_notifications_user_read_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_read_created ON public.user_notifications USING btree (user_id, read_at, created_at DESC);


--
-- Name: idx_user_notifications_user_source_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_user_notifications_user_source_unique ON public.user_notifications USING btree (user_id, source_table, source_id);


--
-- Name: idx_user_notifications_user_unread_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_user_unread_created ON public.user_notifications USING btree (user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_workflow_config_events_changed_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_config_events_changed_by_user ON public.workflow_config_events USING btree (changed_by_user_id, created_at DESC);


--
-- Name: idx_workflow_config_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_config_events_created_at ON public.workflow_config_events USING btree (created_at DESC);


--
-- Name: idx_workflow_config_events_workflow_type_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_config_events_workflow_type_scope ON public.workflow_config_events USING btree (workflow_type, department_id, created_at DESC);


--
-- Name: profiles_username_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_username_unique_idx ON public.profiles USING btree (lower(username));


--
-- Name: uq_leave_approval_workflows_department_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_leave_approval_workflows_department_role ON public.leave_approval_workflows USING btree (department_id, requester_role) WHERE (department_id IS NOT NULL);


--
-- Name: uq_leave_approval_workflows_global_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_leave_approval_workflows_global_role ON public.leave_approval_workflows USING btree (requester_role) WHERE (department_id IS NULL);


--
-- Name: uq_leave_cancellation_workflows_department_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_leave_cancellation_workflows_department_role ON public.leave_cancellation_workflows USING btree (department_id, requester_role) WHERE (department_id IS NOT NULL);


--
-- Name: uq_leave_cancellation_workflows_global_role; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_leave_cancellation_workflows_global_role ON public.leave_cancellation_workflows USING btree (requester_role) WHERE (department_id IS NULL);


--
-- Name: uq_notification_delivery_queue_notification_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_notification_delivery_queue_notification_channel ON public.notification_delivery_queue USING btree (notification_id, channel);


--
-- Name: profiles set_profiles_username; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_profiles_username BEFORE INSERT OR UPDATE OF username, email, employee_id ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_profile_username();


--
-- Name: attendance update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: deduction_types update_deduction_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_deduction_types_updated_at BEFORE UPDATE ON public.deduction_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: department_events update_department_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_department_events_updated_at BEFORE UPDATE ON public.department_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_deductions update_employee_deductions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employee_deductions_updated_at BEFORE UPDATE ON public.employee_deductions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: holidays update_holidays_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_holidays_updated_at BEFORE UPDATE ON public.holidays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_approval_workflows update_leave_approval_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_approval_workflows_updated_at BEFORE UPDATE ON public.leave_approval_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_cancellation_workflows update_leave_cancellation_workflows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_cancellation_workflows_updated_at BEFORE UPDATE ON public.leave_cancellation_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_requests update_leave_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_delivery_queue update_notification_delivery_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_delivery_queue_updated_at BEFORE UPDATE ON public.notification_delivery_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notification_email_worker_runs update_notification_email_worker_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_email_worker_runs_updated_at BEFORE UPDATE ON public.notification_email_worker_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_periods update_payroll_periods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payroll_periods_updated_at BEFORE UPDATE ON public.payroll_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payslips update_payslips_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: performance_reviews update_performance_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_performance_reviews_updated_at BEFORE UPDATE ON public.performance_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_structures update_salary_structures_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON public.salary_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: training_programs update_training_programs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_training_programs_updated_at BEFORE UPDATE ON public.training_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_preferences update_user_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leave_approval_workflows validate_leave_approval_workflows_stages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_leave_approval_workflows_stages BEFORE INSERT OR UPDATE OF approval_stages ON public.leave_approval_workflows FOR EACH ROW EXECUTE FUNCTION public.validate_leave_approval_workflow_stages();


--
-- Name: leave_cancellation_workflows validate_leave_cancellation_workflows_stages; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_leave_cancellation_workflows_stages BEFORE INSERT OR UPDATE OF approval_stages ON public.leave_cancellation_workflows FOR EACH ROW EXECUTE FUNCTION public.validate_leave_cancellation_workflow_stages();


--
-- Name: user_notifications z_before_insert_user_notifications_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER z_before_insert_user_notifications_preferences BEFORE INSERT ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.suppress_muted_user_notifications();


--
-- Name: user_notifications zz_after_insert_user_notifications_enqueue_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zz_after_insert_user_notifications_enqueue_email AFTER INSERT ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_email_delivery();


--
-- Name: profiles zz_guard_profiles_admin_update_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zz_guard_profiles_admin_update_scope BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profiles_admin_update_scope();


--
-- Name: profiles zz_guard_profiles_username_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zz_guard_profiles_username_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_username_admin_hr_only();


--
-- Name: leave_requests zz_set_leave_request_workflow_snapshot; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zz_set_leave_request_workflow_snapshot BEFORE INSERT ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.set_leave_request_workflow_snapshot();


--
-- Name: leave_requests zzx_normalize_leave_request_resubmission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzx_normalize_leave_request_resubmission BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.normalize_leave_request_resubmission();


--
-- Name: leave_requests zzy_normalize_leave_request_state; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzy_normalize_leave_request_state BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.normalize_leave_request_state();


--
-- Name: leave_requests zzz0_enforce_leave_request_transition_sequencing; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzz0_enforce_leave_request_transition_sequencing BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_leave_request_transition_sequencing();


--
-- Name: leave_requests zzz_enforce_leave_request_state_consistency; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzz_enforce_leave_request_state_consistency BEFORE INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_leave_request_state_consistency();


--
-- Name: leave_request_events zzzz_create_leave_event_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzzz_create_leave_event_notifications AFTER INSERT ON public.leave_request_events FOR EACH ROW EXECUTE FUNCTION public.create_leave_event_notifications();


--
-- Name: workflow_config_events zzzz_create_workflow_config_event_notifications; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzzz_create_workflow_config_event_notifications AFTER INSERT ON public.workflow_config_events FOR EACH ROW EXECUTE FUNCTION public.create_workflow_config_event_notifications();


--
-- Name: leave_approval_workflows zzzz_log_leave_approval_workflow_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzzz_log_leave_approval_workflow_events AFTER INSERT OR DELETE OR UPDATE ON public.leave_approval_workflows FOR EACH ROW EXECUTE FUNCTION public.log_workflow_config_events();


--
-- Name: leave_cancellation_workflows zzzz_log_leave_cancellation_workflow_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzzz_log_leave_cancellation_workflow_events AFTER INSERT OR DELETE OR UPDATE ON public.leave_cancellation_workflows FOR EACH ROW EXECUTE FUNCTION public.log_workflow_config_events();


--
-- Name: leave_requests zzzz_log_leave_request_events; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER zzzz_log_leave_request_events AFTER INSERT OR UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION public.log_leave_request_events();


--
-- Name: announcements announcements_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id);


--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: department_events department_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_events
    ADD CONSTRAINT department_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: department_events department_events_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.department_events
    ADD CONSTRAINT department_events_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: departments departments_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);


--
-- Name: documents documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: employee_deductions employee_deductions_deduction_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT employee_deductions_deduction_type_id_fkey FOREIGN KEY (deduction_type_id) REFERENCES public.deduction_types(id) ON DELETE CASCADE;


--
-- Name: employee_deductions employee_deductions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_deductions
    ADD CONSTRAINT employee_deductions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: holidays holidays_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holidays
    ADD CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: leave_approval_workflows leave_approval_workflows_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_approval_workflows
    ADD CONSTRAINT leave_approval_workflows_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_cancellation_workflows
    ADD CONSTRAINT leave_cancellation_workflows_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: leave_request_events leave_request_events_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_request_events
    ADD CONSTRAINT leave_request_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: leave_request_events leave_request_events_leave_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_request_events
    ADD CONSTRAINT leave_request_events_leave_request_id_fkey FOREIGN KEY (leave_request_id) REFERENCES public.leave_requests(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_director_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_director_approved_by_fkey FOREIGN KEY (director_approved_by) REFERENCES public.profiles(id);


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_final_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_final_approved_by_fkey FOREIGN KEY (final_approved_by) REFERENCES public.profiles(id);


--
-- Name: leave_requests leave_requests_gm_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_gm_approved_by_fkey FOREIGN KEY (gm_approved_by) REFERENCES public.profiles(id);


--
-- Name: leave_requests leave_requests_hr_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_hr_approved_by_fkey FOREIGN KEY (hr_approved_by) REFERENCES public.profiles(id);


--
-- Name: leave_requests leave_requests_leave_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_leave_type_id_fkey FOREIGN KEY (leave_type_id) REFERENCES public.leave_types(id);


--
-- Name: leave_requests leave_requests_manager_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_manager_approved_by_fkey FOREIGN KEY (manager_approved_by) REFERENCES public.profiles(id);


--
-- Name: leave_requests leave_requests_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.profiles(id);


--
-- Name: notification_delivery_queue notification_delivery_queue_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_queue
    ADD CONSTRAINT notification_delivery_queue_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.user_notifications(id) ON DELETE CASCADE;


--
-- Name: notification_delivery_queue notification_delivery_queue_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_delivery_queue
    ADD CONSTRAINT notification_delivery_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payroll_periods payroll_periods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_periods
    ADD CONSTRAINT payroll_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: payslips payslips_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: payslips payslips_payroll_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payslips
    ADD CONSTRAINT payslips_payroll_period_id_fkey FOREIGN KEY (payroll_period_id) REFERENCES public.payroll_periods(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: performance_reviews performance_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_reviews
    ADD CONSTRAINT performance_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id);


--
-- Name: salary_structures salary_structures_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.salary_structures
    ADD CONSTRAINT salary_structures_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_enrollments training_enrollments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: training_enrollments training_enrollments_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_enrollments
    ADD CONSTRAINT training_enrollments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.training_programs(id) ON DELETE CASCADE;


--
-- Name: training_programs training_programs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.training_programs
    ADD CONSTRAINT training_programs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_leave_request_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_leave_request_event_id_fkey FOREIGN KEY (leave_request_event_id) REFERENCES public.leave_request_events(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_leave_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_leave_request_id_fkey FOREIGN KEY (leave_request_id) REFERENCES public.leave_requests(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: workflow_config_events workflow_config_events_changed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_config_events
    ADD CONSTRAINT workflow_config_events_changed_by_user_id_fkey FOREIGN KEY (changed_by_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements announcements_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_delete_hr_director ON public.announcements FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: announcements announcements_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_insert_hr_director ON public.announcements FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: announcements announcements_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_select_authenticated ON public.announcements FOR SELECT TO authenticated USING ((((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: announcements announcements_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY announcements_update_hr_director ON public.announcements FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: attendance attendance_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_delete_hr_director ON public.attendance FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: attendance attendance_insert_self_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_insert_self_hr_director ON public.attendance FOR INSERT TO authenticated WITH CHECK (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: attendance attendance_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_select_authenticated ON public.attendance FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND ((employee_id = public.request_user_id()) OR public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND ((employee_id = public.request_user_id()) OR public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id)))));


--
-- Name: attendance attendance_update_self_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendance_update_self_hr_director ON public.attendance FOR UPDATE TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: deduction_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;

--
-- Name: deduction_types deduction_types_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deduction_types_delete_policy ON public.deduction_types FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: deduction_types deduction_types_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deduction_types_insert_policy ON public.deduction_types FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: deduction_types deduction_types_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deduction_types_select_policy ON public.deduction_types FOR SELECT TO authenticated USING (true);


--
-- Name: deduction_types deduction_types_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deduction_types_update_policy ON public.deduction_types FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: department_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.department_events ENABLE ROW LEVEL SECURITY;

--
-- Name: department_events department_events_delete_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY department_events_delete_privileged ON public.department_events FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR ((public.has_role(public.request_user_id(), 'manager'::public.app_role) OR public.has_role(public.request_user_id(), 'general_manager'::public.app_role)) AND public.is_department_manager(public.request_user_id(), public.request_user_id()))));


--
-- Name: department_events department_events_insert_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY department_events_insert_privileged ON public.department_events FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR ((public.has_role(public.request_user_id(), 'manager'::public.app_role) OR public.has_role(public.request_user_id(), 'general_manager'::public.app_role)) AND public.is_department_manager(public.request_user_id(), public.request_user_id()))));


--
-- Name: department_events department_events_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY department_events_select_authenticated ON public.department_events FOR SELECT TO authenticated USING (((department_id IN ( SELECT profiles.department_id
   FROM public.profiles
  WHERE (profiles.id = public.request_user_id()))) OR (department_id IS NULL) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR ((public.has_role(public.request_user_id(), 'manager'::public.app_role) OR public.has_role(public.request_user_id(), 'general_manager'::public.app_role)) AND public.is_department_manager(public.request_user_id(), public.request_user_id()))));


--
-- Name: department_events department_events_update_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY department_events_update_privileged ON public.department_events FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR ((public.has_role(public.request_user_id(), 'manager'::public.app_role) OR public.has_role(public.request_user_id(), 'general_manager'::public.app_role)) AND public.is_department_manager(public.request_user_id(), public.request_user_id())))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR ((public.has_role(public.request_user_id(), 'manager'::public.app_role) OR public.has_role(public.request_user_id(), 'general_manager'::public.app_role)) AND public.is_department_manager(public.request_user_id(), public.request_user_id()))));


--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: departments departments_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_delete_hr_director ON public.departments FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: departments departments_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_insert_hr_director ON public.departments FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: departments departments_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_select_authenticated ON public.departments FOR SELECT TO authenticated USING (true);


--
-- Name: departments departments_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY departments_update_hr_director ON public.departments FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_delete_hr_director ON public.documents FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: documents documents_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_insert_hr_director ON public.documents FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: documents documents_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select_authenticated ON public.documents FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND public.is_department_manager(public.request_user_id(), employee_id)) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND public.is_department_manager(public.request_user_id(), employee_id))));


--
-- Name: documents documents_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_update_hr_director ON public.documents FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: employee_deductions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

--
-- Name: employee_deductions employee_deductions_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_deductions_delete_policy ON public.employee_deductions FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: employee_deductions employee_deductions_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_deductions_insert_policy ON public.employee_deductions FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: employee_deductions employee_deductions_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_deductions_select_policy ON public.employee_deductions FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: employee_deductions employee_deductions_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employee_deductions_update_policy ON public.employee_deductions FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: holidays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

--
-- Name: holidays holidays_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY holidays_delete_hr_director ON public.holidays FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: holidays holidays_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY holidays_insert_hr_director ON public.holidays FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: holidays holidays_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY holidays_select_authenticated ON public.holidays FOR SELECT TO authenticated USING (true);


--
-- Name: holidays holidays_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY holidays_update_hr_director ON public.holidays FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: leave_approval_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_approval_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_approval_workflows leave_approval_workflows_delete_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_approval_workflows_delete_privileged ON public.leave_approval_workflows FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_approval_workflows leave_approval_workflows_insert_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_approval_workflows_insert_privileged ON public.leave_approval_workflows FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_approval_workflows leave_approval_workflows_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_approval_workflows_select_authenticated ON public.leave_approval_workflows FOR SELECT TO authenticated USING (true);


--
-- Name: leave_approval_workflows leave_approval_workflows_update_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_approval_workflows_update_privileged ON public.leave_approval_workflows FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_cancellation_workflows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_cancellation_workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_delete_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_cancellation_workflows_delete_privileged ON public.leave_cancellation_workflows FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_insert_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_cancellation_workflows_insert_privileged ON public.leave_cancellation_workflows FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_cancellation_workflows_select_authenticated ON public.leave_cancellation_workflows FOR SELECT TO authenticated USING (true);


--
-- Name: leave_cancellation_workflows leave_cancellation_workflows_update_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_cancellation_workflows_update_privileged ON public.leave_cancellation_workflows FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: leave_request_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_request_events ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_request_events leave_request_events_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_request_events_select_authenticated ON public.leave_request_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.leave_requests lr
  WHERE ((lr.id = leave_request_events.leave_request_id) AND ((lr.employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), lr.employee_id) OR public.is_department_manager(public.request_user_id(), lr.employee_id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), lr.employee_id) OR public.is_department_manager(public.request_user_id(), lr.employee_id))))))));


--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests leave_requests_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_insert_self ON public.leave_requests FOR INSERT TO authenticated WITH CHECK ((employee_id = public.request_user_id()));


--
-- Name: leave_requests leave_requests_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_select_authenticated ON public.leave_requests FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id)))));


--
-- Name: leave_requests leave_requests_update_workflow_and_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_requests_update_workflow_and_self ON public.leave_requests FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR ((employee_id = public.request_user_id()) AND (status = 'pending'::text)))) WITH CHECK ((public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND (public.is_manager_of(public.request_user_id(), employee_id) OR public.is_department_manager(public.request_user_id(), employee_id))) OR (employee_id = public.request_user_id())));


--
-- Name: leave_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_types leave_types_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_types_delete_hr_director ON public.leave_types FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: leave_types leave_types_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_types_insert_hr_director ON public.leave_types FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: leave_types leave_types_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_types_select_authenticated ON public.leave_types FOR SELECT TO authenticated USING (true);


--
-- Name: leave_types leave_types_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leave_types_update_hr_director ON public.leave_types FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role)));


--
-- Name: notification_delivery_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_delivery_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_delivery_queue notification_delivery_queue_service_role_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_delivery_queue_service_role_all ON public.notification_delivery_queue TO service_role USING (true) WITH CHECK (true);


--
-- Name: notification_email_worker_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_email_worker_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_email_worker_runs notification_email_worker_runs_select_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_email_worker_runs_select_privileged ON public.notification_email_worker_runs FOR SELECT TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payroll_periods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_periods payroll_periods_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_periods_delete_policy ON public.payroll_periods FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payroll_periods payroll_periods_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_periods_insert_policy ON public.payroll_periods FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payroll_periods payroll_periods_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_periods_select_policy ON public.payroll_periods FOR SELECT TO authenticated USING (true);


--
-- Name: payroll_periods payroll_periods_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payroll_periods_update_policy ON public.payroll_periods FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payslips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

--
-- Name: payslips payslips_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payslips_delete_policy ON public.payslips FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payslips payslips_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payslips_insert_policy ON public.payslips FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payslips payslips_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payslips_select_policy ON public.payslips FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: payslips payslips_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payslips_update_policy ON public.payslips FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: performance_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: performance_reviews performance_reviews_delete_reviewer_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY performance_reviews_delete_reviewer_hr_director ON public.performance_reviews FOR DELETE TO authenticated USING (((reviewer_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: performance_reviews performance_reviews_insert_reviewer_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY performance_reviews_insert_reviewer_hr_director ON public.performance_reviews FOR INSERT TO authenticated WITH CHECK (((reviewer_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: performance_reviews performance_reviews_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY performance_reviews_select_authenticated ON public.performance_reviews FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR (reviewer_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: performance_reviews performance_reviews_update_reviewer_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY performance_reviews_update_reviewer_hr_director ON public.performance_reviews FOR UPDATE TO authenticated USING (((reviewer_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK (((reviewer_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_delete_hr_director ON public.profiles FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: profiles profiles_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_hr_director ON public.profiles FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: profiles profiles_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (((id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role) OR (public.has_role(public.request_user_id(), 'manager'::public.app_role) AND ((id = public.request_user_id()) OR (manager_id = public.request_user_id()) OR public.is_department_manager(public.request_user_id(), id))) OR (public.has_role(public.request_user_id(), 'general_manager'::public.app_role) AND ((id = public.request_user_id()) OR (manager_id = public.request_user_id()) OR public.is_department_manager(public.request_user_id(), id)))));


--
-- Name: profiles profiles_update_self_hr_admin_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self_hr_admin_director ON public.profiles FOR UPDATE TO authenticated USING (((id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK (((id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: salary_structures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.salary_structures ENABLE ROW LEVEL SECURITY;

--
-- Name: salary_structures salary_structures_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_structures_delete_policy ON public.salary_structures FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: salary_structures salary_structures_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_structures_insert_policy ON public.salary_structures FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: salary_structures salary_structures_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_structures_select_policy ON public.salary_structures FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: salary_structures salary_structures_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY salary_structures_update_policy ON public.salary_structures FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: training_enrollments training_enrollments_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_enrollments_delete_hr_director ON public.training_enrollments FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_enrollments training_enrollments_insert_self_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_enrollments_insert_self_hr_director ON public.training_enrollments FOR INSERT TO authenticated WITH CHECK (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_enrollments training_enrollments_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_enrollments_select_authenticated ON public.training_enrollments FOR SELECT TO authenticated USING (((employee_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_enrollments training_enrollments_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_enrollments_update_hr_director ON public.training_enrollments FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;

--
-- Name: training_programs training_programs_delete_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_programs_delete_hr_director ON public.training_programs FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_programs training_programs_insert_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_programs_insert_hr_director ON public.training_programs FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: training_programs training_programs_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_programs_select_authenticated ON public.training_programs FOR SELECT TO authenticated USING (true);


--
-- Name: training_programs training_programs_update_hr_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY training_programs_update_hr_director ON public.training_programs FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences user_notification_preferences_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_notification_preferences_insert_own ON public.user_notification_preferences FOR INSERT TO authenticated WITH CHECK ((user_id = public.request_user_id()));


--
-- Name: user_notification_preferences user_notification_preferences_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_notification_preferences_select_own ON public.user_notification_preferences FOR SELECT TO authenticated USING ((user_id = public.request_user_id()));


--
-- Name: user_notification_preferences user_notification_preferences_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_notification_preferences_update_own ON public.user_notification_preferences FOR UPDATE TO authenticated USING ((user_id = public.request_user_id())) WITH CHECK ((user_id = public.request_user_id()));


--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications user_notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT TO authenticated USING ((user_id = public.request_user_id()));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_delete_admin_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_delete_admin_director ON public.user_roles FOR DELETE TO authenticated USING ((public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: user_roles user_roles_insert_admin_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_insert_admin_director ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: user_roles user_roles_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_select_authenticated ON public.user_roles FOR SELECT TO authenticated USING (((user_id = public.request_user_id()) OR public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: user_roles user_roles_update_admin_director; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_update_admin_director ON public.user_roles FOR UPDATE TO authenticated USING ((public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role))) WITH CHECK ((public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- Name: workflow_config_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_config_events ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_config_events workflow_config_events_select_privileged; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY workflow_config_events_select_privileged ON public.workflow_config_events FOR SELECT TO authenticated USING ((public.has_role(public.request_user_id(), 'hr'::public.app_role) OR public.has_role(public.request_user_id(), 'admin'::public.app_role) OR public.has_role(public.request_user_id(), 'director'::public.app_role)));


--
-- PostgreSQL database dump complete
--

