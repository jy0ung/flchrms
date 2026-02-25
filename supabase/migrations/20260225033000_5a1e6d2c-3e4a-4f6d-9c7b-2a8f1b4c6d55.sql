-- Phase 4B: route-aware leave/cancellation invariants + DB-side normalization

CREATE OR REPLACE FUNCTION public.normalize_leave_request_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS zzz_enforce_leave_request_state_consistency ON public.leave_requests;

CREATE TRIGGER zzz_enforce_leave_request_state_consistency
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_state_consistency();

-- Normalize existing rows through the new trigger chain (snapshot -> normalize -> enforce).
UPDATE public.leave_requests
SET approval_route_snapshot = approval_route_snapshot,
    cancellation_route_snapshot = cancellation_route_snapshot,
    document_url = document_url,
    manager_comments = manager_comments,
    amendment_notes = amendment_notes,
    rejection_reason = rejection_reason,
    cancellation_reason = cancellation_reason,
    cancellation_comments = cancellation_comments,
    cancellation_rejection_reason = cancellation_rejection_reason
WHERE approval_route_snapshot IS NOT NULL
   OR cancellation_route_snapshot IS NOT NULL
   OR document_url IS NOT NULL
   OR manager_comments IS NOT NULL
   OR amendment_notes IS NOT NULL
   OR rejection_reason IS NOT NULL
   OR cancellation_reason IS NOT NULL
   OR cancellation_comments IS NOT NULL
   OR cancellation_rejection_reason IS NOT NULL
   OR (
        status = 'cancelled'
        AND final_approved_at IS NOT NULL
        AND cancellation_status IS NULL
        AND cancelled_at IS NOT NULL
        AND cancelled_by IS NOT NULL
        AND cancelled_by_role IS NOT NULL
      );

DROP TRIGGER IF EXISTS zzy_normalize_leave_request_state ON public.leave_requests;

CREATE TRIGGER zzy_normalize_leave_request_state
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.normalize_leave_request_state();

CREATE OR REPLACE FUNCTION public.enforce_leave_request_state_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
