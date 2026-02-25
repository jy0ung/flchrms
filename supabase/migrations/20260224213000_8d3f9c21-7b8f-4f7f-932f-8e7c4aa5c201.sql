-- Leave cancellation workflow (request + approval), with configurable routes

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS cancellation_status TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_route_snapshot TEXT[] NULL,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_comments TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_manager_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_manager_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_gm_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_gm_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_director_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_director_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_final_approved_by_role public.app_role NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejected_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancellation_rejection_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by_role public.app_role NULL;

ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_cancellation_status_check;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_cancellation_status_check
  CHECK (
    cancellation_status IS NULL
    OR cancellation_status IN (
      'pending',
      'manager_approved',
      'gm_approved',
      'director_approved',
      'approved',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancellation_status
  ON public.leave_requests (cancellation_status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_cancellation_requested_at
  ON public.leave_requests (cancellation_requested_at);

CREATE TABLE IF NOT EXISTS public.leave_cancellation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_role public.app_role NOT NULL UNIQUE,
  approval_stages TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_leave_cancellation_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
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
REVOKE ALL ON FUNCTION public.validate_leave_cancellation_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_leave_cancellation_workflows_stages ON public.leave_cancellation_workflows;
CREATE TRIGGER validate_leave_cancellation_workflows_stages
BEFORE INSERT OR UPDATE OF approval_stages
ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.validate_leave_cancellation_workflow_stages();

DROP TRIGGER IF EXISTS update_leave_cancellation_workflows_updated_at ON public.leave_cancellation_workflows;
CREATE TRIGGER update_leave_cancellation_workflows_updated_at
BEFORE UPDATE ON public.leave_cancellation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leave_cancellation_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS leave_cancellation_workflows_select_authenticated ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_select_authenticated
ON public.leave_cancellation_workflows
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS leave_cancellation_workflows_insert_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_insert_privileged
ON public.leave_cancellation_workflows
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

DROP POLICY IF EXISTS leave_cancellation_workflows_update_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_update_privileged
ON public.leave_cancellation_workflows
FOR UPDATE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

DROP POLICY IF EXISTS leave_cancellation_workflows_delete_privileged ON public.leave_cancellation_workflows;
CREATE POLICY leave_cancellation_workflows_delete_privileged
ON public.leave_cancellation_workflows
FOR DELETE
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
  OR public.has_role(public.request_user_id(), 'director'::public.app_role)
);

INSERT INTO public.leave_cancellation_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'director']::TEXT[], true, 'Default employee cancellation route'),
  ('manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default manager cancellation route'),
  ('general_manager', ARRAY['general_manager', 'director']::TEXT[], true, 'Default GM cancellation route'),
  ('director', ARRAY['director']::TEXT[], true, 'Default director cancellation route'),
  ('hr', ARRAY['director']::TEXT[], true, 'Default HR cancellation route'),
  ('admin', ARRAY['director']::TEXT[], true, 'Default admin cancellation route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_cancellation_workflows.notes, EXCLUDED.notes);

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  requester_role_value public.app_role := 'employee';
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

  -- Pending leave can be self-cancelled immediately.
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

  SELECT approval_stages
  INTO raw_route
  FROM public.leave_cancellation_workflows
  WHERE leave_cancellation_workflows.requester_role = requester_role_value
    AND is_active = true;

  IF raw_route IS NULL OR coalesce(array_length(raw_route, 1), 0) = 0 THEN
    raw_route := CASE requester_role_value
      WHEN 'employee' THEN ARRAY['manager', 'general_manager', 'director']::TEXT[]
      WHEN 'manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      WHEN 'general_manager' THEN ARRAY['general_manager', 'director']::TEXT[]
      ELSE ARRAY['director']::TEXT[]
    END;
  END IF;

  IF 'manager' = ANY(raw_route) THEN
    route := array_append(route, 'manager');
  END IF;
  IF 'general_manager' = ANY(raw_route) THEN
    route := array_append(route, 'general_manager');
  END IF;
  IF 'director' = ANY(raw_route) THEN
    route := array_append(route, 'director');
  END IF;

  IF coalesce(array_length(route, 1), 0) = 0 THEN
    route := ARRAY['director']::TEXT[];
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = route,
      cancellation_requested_at = now_ts,
      cancellation_requested_by = requester_id,
      cancellation_reason = NULLIF(pg_catalog.btrim(COALESCE(_reason, '')), ''),
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

DROP FUNCTION IF EXISTS public.request_leave_cancellation(UUID);
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_requests;
ANALYZE public.leave_cancellation_workflows;
