-- Phase 4C: deeper amendment/resubmit sequencing invariants + leave workflow event log groundwork

CREATE OR REPLACE FUNCTION public.normalize_leave_request_resubmission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS zzx_normalize_leave_request_resubmission ON public.leave_requests;

CREATE TRIGGER zzx_normalize_leave_request_resubmission
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leave_request_resubmission();

CREATE OR REPLACE FUNCTION public.enforce_leave_request_transition_sequencing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS zzz0_enforce_leave_request_transition_sequencing ON public.leave_requests;

CREATE TRIGGER zzz0_enforce_leave_request_transition_sequencing
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_transition_sequencing();

CREATE TABLE IF NOT EXISTS public.leave_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.app_role NULL,
  from_status text NULL,
  to_status text NULL,
  from_cancellation_status text NULL,
  to_cancellation_status text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_request_events_leave_request_id_occurred_at
  ON public.leave_request_events (leave_request_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_leave_request_events_event_type
  ON public.leave_request_events (event_type);

ALTER TABLE public.leave_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_request_events_select_authenticated ON public.leave_request_events;
CREATE POLICY leave_request_events_select_authenticated
ON public.leave_request_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.leave_requests lr
    WHERE lr.id = leave_request_events.leave_request_id
      AND (
        lr.employee_id = public.request_user_id()
        OR public.has_role(public.request_user_id(), 'hr')
        OR public.has_role(public.request_user_id(), 'admin')
        OR public.has_role(public.request_user_id(), 'director')
        OR (
          public.has_role(public.request_user_id(), 'manager')
          AND (
            public.is_manager_of(public.request_user_id(), lr.employee_id)
            OR public.is_department_manager(public.request_user_id(), lr.employee_id)
          )
        )
        OR (
          public.has_role(public.request_user_id(), 'general_manager')
          AND (
            public.is_manager_of(public.request_user_id(), lr.employee_id)
            OR public.is_department_manager(public.request_user_id(), lr.employee_id)
          )
        )
      )
  )
);

GRANT SELECT ON public.leave_request_events TO authenticated;
REVOKE ALL ON public.leave_request_events FROM anon;

CREATE OR REPLACE FUNCTION public.log_leave_request_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS zzzz_log_leave_request_events ON public.leave_requests;

CREATE TRIGGER zzzz_log_leave_request_events
AFTER INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_leave_request_events();

ANALYZE public.leave_request_events;
