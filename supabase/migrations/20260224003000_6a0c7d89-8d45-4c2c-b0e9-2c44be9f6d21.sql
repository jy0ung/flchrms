-- Dynamic final approver for leave workflows (Director optional)
-- Adds per-request workflow snapshot and generic final approval markers.

-- Ensure leave status constraint supports multi-level statuses on environments with older checks.
ALTER TABLE public.leave_requests
DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests
ADD CONSTRAINT leave_requests_status_check
CHECK (
  status = ANY (
    ARRAY[
      'pending'::text,
      'manager_approved'::text,
      'gm_approved'::text,
      'director_approved'::text,
      'hr_approved'::text,
      'rejected'::text,
      'cancelled'::text
    ]
  )
);

-- Generic final-approval markers + frozen workflow snapshot per request.
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_route_snapshot TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS final_approved_by UUID NULL REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS final_approved_by_role public.app_role NULL;

CREATE INDEX IF NOT EXISTS idx_leave_requests_final_approved_at
  ON public.leave_requests (final_approved_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_final_approved_by
  ON public.leave_requests (final_approved_by);

-- Workflow validator: allow any non-empty canonical subset of manager/gm/director.
CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
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
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

-- Resolve the effective workflow for a leave request at creation time (snapshot source).
CREATE OR REPLACE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_requester_role public.app_role := coalesce(public.get_user_role(_employee_id), 'employee'::public.app_role);
  configured_stages TEXT[];
  normalized_stages TEXT[];
BEGIN
  SELECT w.approval_stages
  INTO configured_stages
  FROM public.leave_approval_workflows w
  WHERE w.requester_role = resolved_requester_role
    AND coalesce(w.is_active, true)
  LIMIT 1;

  normalized_stages := ARRAY(
    SELECT stage
    FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
    WHERE stage = ANY(coalesce(configured_stages, ARRAY[]::TEXT[]))
  );

  IF coalesce(array_length(normalized_stages, 1), 0) > 0 THEN
    RETURN normalized_stages;
  END IF;

  -- Fallback defaults if workflow table row is missing or inactive.
  IF resolved_requester_role = 'employee'::public.app_role THEN
    RETURN ARRAY['manager', 'general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSIF resolved_requester_role = 'general_manager'::public.app_role THEN
    RETURN ARRAY['general_manager', 'director']::TEXT[];
  ELSE
    RETURN ARRAY['director']::TEXT[];
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_leave_request_workflow_snapshot(UUID) TO authenticated, service_role;

-- Stamp a workflow snapshot when the request is created.
CREATE OR REPLACE FUNCTION public.set_leave_request_workflow_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
REVOKE ALL ON FUNCTION public.set_leave_request_workflow_snapshot() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zz_set_leave_request_workflow_snapshot ON public.leave_requests;
CREATE TRIGGER zz_set_leave_request_workflow_snapshot
BEFORE INSERT ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_leave_request_workflow_snapshot();

-- Backfill workflow snapshot for existing rows.
UPDATE public.leave_requests lr
SET approval_route_snapshot = public.resolve_leave_request_workflow_snapshot(lr.employee_id)
WHERE coalesce(array_length(lr.approval_route_snapshot, 1), 0) = 0;

-- Backfill generic final approval markers for legacy approved rows.
UPDATE public.leave_requests lr
SET final_approved_at = coalesce(
      lr.final_approved_at,
      lr.hr_approved_at,
      lr.director_approved_at,
      lr.gm_approved_at,
      lr.manager_approved_at,
      lr.updated_at
    ),
    final_approved_by = coalesce(
      lr.final_approved_by,
      lr.hr_approved_by,
      lr.director_approved_by,
      lr.gm_approved_by,
      lr.manager_approved_by
    ),
    final_approved_by_role = coalesce(
      lr.final_approved_by_role,
      CASE
        WHEN lr.hr_approved_by IS NOT NULL THEN coalesce(public.get_user_role(lr.hr_approved_by), 'hr'::public.app_role)
        WHEN lr.director_approved_by IS NOT NULL THEN 'director'::public.app_role
        WHEN lr.gm_approved_by IS NOT NULL THEN 'general_manager'::public.app_role
        WHEN lr.manager_approved_by IS NOT NULL THEN 'manager'::public.app_role
        ELSE NULL
      END
    )
WHERE lr.status IN ('director_approved', 'hr_approved')
  AND (
    lr.final_approved_at IS NULL
    OR lr.final_approved_by IS NULL
    OR lr.final_approved_by_role IS NULL
  );

ANALYZE public.leave_requests;
