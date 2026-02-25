-- Phase 4: leave/cancellation state-machine hardening (DB invariants)

CREATE OR REPLACE FUNCTION public.enforce_leave_request_state_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  canonical_stages text[] := ARRAY['manager', 'general_manager', 'director']::text[];
  normalized_approval_route text[] := NULL;
  normalized_cancellation_route text[] := NULL;
  final_triplet_count int := 0;
  cancelled_triplet_count int := 0;
  cancellation_final_triplet_count int := 0;
  cancellation_reject_pair_count int := 0;
  cancellation_request_core_count int := 0;
BEGIN
  -- Route snapshots must be canonical (ordered, unique, valid stages only).
  IF NEW.approval_route_snapshot IS NOT NULL THEN
    normalized_approval_route := ARRAY(
      SELECT stage
      FROM unnest(canonical_stages) AS stage
      WHERE stage = ANY(coalesce(NEW.approval_route_snapshot, ARRAY[]::text[]))
    );

    IF normalized_approval_route IS DISTINCT FROM NEW.approval_route_snapshot THEN
      RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot must contain unique canonical stages in fixed order'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NEW.cancellation_route_snapshot IS NOT NULL THEN
    normalized_cancellation_route := ARRAY(
      SELECT stage
      FROM unnest(canonical_stages) AS stage
      WHERE stage = ANY(coalesce(NEW.cancellation_route_snapshot, ARRAY[]::text[]))
    );

    IF normalized_cancellation_route IS DISTINCT FROM NEW.cancellation_route_snapshot THEN
      RAISE EXCEPTION 'leave_requests state invariant: cancellation_route_snapshot must contain unique canonical stages in fixed order'
        USING ERRCODE = '22023';
    END IF;
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

  -- Rejection metadata consistency for base leave request.
  IF ((CASE WHEN NEW.rejected_at IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN NEW.rejected_by IS NOT NULL THEN 1 ELSE 0 END)) NOT IN (0, 2)
  THEN
    RAISE EXCEPTION 'leave_requests state invariant: leave rejection metadata must include both timestamp and actor'
      USING ERRCODE = '22023';
  END IF;

  -- Final-approved rows should never be pending or rejected.
  IF NEW.final_approved_at IS NOT NULL AND NEW.status IN ('pending', 'rejected') THEN
    RAISE EXCEPTION 'leave_requests state invariant: final-approved leave cannot have pending/rejected status'
      USING ERRCODE = '22023';
  END IF;

  -- Status-specific core requirements.
  IF NEW.status = 'pending' THEN
    IF NEW.manager_approved_at IS NOT NULL
       OR NEW.manager_approved_by IS NOT NULL
       OR NEW.gm_approved_at IS NOT NULL
       OR NEW.gm_approved_by IS NOT NULL
       OR NEW.director_approved_at IS NOT NULL
       OR NEW.director_approved_by IS NOT NULL
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
    IF NEW.manager_approved_at IS NULL OR NEW.manager_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: manager_approved status requires manager approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'gm_approved' THEN
    IF NEW.gm_approved_at IS NULL OR NEW.gm_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: gm_approved status requires GM approval stamps'
        USING ERRCODE = '22023';
    END IF;
  ELSIF NEW.status = 'director_approved' THEN
    IF NEW.director_approved_at IS NULL OR NEW.director_approved_by IS NULL THEN
      RAISE EXCEPTION 'leave_requests state invariant: director_approved status requires director approval stamps'
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

  -- Approval route snapshot should exist once a request leaves the initial pending state, is final-approved,
  -- or enters a cancellation workflow.
  IF (
    NEW.status <> 'pending'
    OR NEW.final_approved_at IS NOT NULL
    OR NEW.cancellation_status IS NOT NULL
  ) AND coalesce(array_length(NEW.approval_route_snapshot, 1), 0) = 0 THEN
    RAISE EXCEPTION 'leave_requests state invariant: approval_route_snapshot is required for non-pending or final/cancellation states'
      USING ERRCODE = '22023';
  END IF;

  -- If not final approved, there must be no cancellation workflow state.
  IF NEW.final_approved_at IS NULL AND (
    NEW.cancellation_status IS NOT NULL
    OR NEW.cancellation_route_snapshot IS NOT NULL
    OR NEW.cancellation_requested_at IS NOT NULL
    OR NEW.cancellation_requested_by IS NOT NULL
    OR NEW.cancellation_reason IS NOT NULL
    OR NEW.cancellation_comments IS NOT NULL
    OR NEW.cancellation_manager_approved_at IS NOT NULL
    OR NEW.cancellation_manager_approved_by IS NOT NULL
    OR NEW.cancellation_gm_approved_at IS NOT NULL
    OR NEW.cancellation_gm_approved_by IS NOT NULL
    OR NEW.cancellation_director_approved_at IS NOT NULL
    OR NEW.cancellation_director_approved_by IS NOT NULL
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
       OR NEW.cancellation_manager_approved_at IS NOT NULL
       OR NEW.cancellation_manager_approved_by IS NOT NULL
       OR NEW.cancellation_gm_approved_at IS NOT NULL
       OR NEW.cancellation_gm_approved_by IS NOT NULL
       OR NEW.cancellation_director_approved_at IS NOT NULL
       OR NEW.cancellation_director_approved_by IS NOT NULL
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
    IF coalesce(array_length(NEW.cancellation_route_snapshot, 1), 0) = 0 THEN
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

    IF NEW.cancellation_status IN ('pending', 'manager_approved', 'gm_approved', 'director_approved') THEN
      IF NEW.status = 'cancelled' THEN
        RAISE EXCEPTION 'leave_requests state invariant: active cancellation workflow cannot exist on cancelled leave'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'manager_approved' AND (
        NEW.cancellation_manager_approved_at IS NULL OR NEW.cancellation_manager_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: manager_approved cancellation status requires manager approval stamps'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'gm_approved' AND (
        NEW.cancellation_gm_approved_at IS NULL OR NEW.cancellation_gm_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: gm_approved cancellation status requires GM approval stamps'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.cancellation_status = 'director_approved' AND (
        NEW.cancellation_director_approved_at IS NULL OR NEW.cancellation_director_approved_by IS NULL
      ) THEN
        RAISE EXCEPTION 'leave_requests state invariant: director_approved cancellation status requires director approval stamps'
          USING ERRCODE = '22023';
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

DROP TRIGGER IF EXISTS zzz_enforce_leave_request_state_consistency ON public.leave_requests;

CREATE TRIGGER zzz_enforce_leave_request_state_consistency
BEFORE INSERT OR UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.enforce_leave_request_state_consistency();

-- Backfill legacy approved+cancelled rows that were created before the explicit cancellation workflow model.
UPDATE public.leave_requests lr
SET cancellation_status = 'approved',
    cancellation_route_snapshot = coalesce(lr.cancellation_route_snapshot, lr.approval_route_snapshot),
    cancellation_requested_at = coalesce(lr.cancellation_requested_at, lr.cancelled_at),
    cancellation_requested_by = coalesce(lr.cancellation_requested_by, lr.employee_id),
    cancellation_final_approved_at = coalesce(lr.cancellation_final_approved_at, lr.cancelled_at),
    cancellation_final_approved_by = coalesce(lr.cancellation_final_approved_by, lr.cancelled_by),
    cancellation_final_approved_by_role = coalesce(lr.cancellation_final_approved_by_role, lr.cancelled_by_role)
WHERE lr.status = 'cancelled'
  AND lr.final_approved_at IS NOT NULL
  AND lr.cancellation_status IS NULL
  AND lr.cancelled_at IS NOT NULL
  AND lr.cancelled_by IS NOT NULL
  AND lr.cancelled_by_role IS NOT NULL;
