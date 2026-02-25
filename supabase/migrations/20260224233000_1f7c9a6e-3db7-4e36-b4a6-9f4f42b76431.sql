-- Department-scoped leave approval/cancellation workflows with global fallback

ALTER TABLE public.leave_approval_workflows
  ADD COLUMN IF NOT EXISTS department_id UUID NULL;

ALTER TABLE public.leave_cancellation_workflows
  ADD COLUMN IF NOT EXISTS department_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_approval_workflows_department_id_fkey'
  ) THEN
    ALTER TABLE public.leave_approval_workflows
      ADD CONSTRAINT leave_approval_workflows_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leave_cancellation_workflows_department_id_fkey'
  ) THEN
    ALTER TABLE public.leave_cancellation_workflows
      ADD CONSTRAINT leave_cancellation_workflows_department_id_fkey
      FOREIGN KEY (department_id)
      REFERENCES public.departments(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.leave_approval_workflows
  DROP CONSTRAINT IF EXISTS leave_approval_workflows_requester_role_key;

ALTER TABLE public.leave_cancellation_workflows
  DROP CONSTRAINT IF EXISTS leave_cancellation_workflows_requester_role_key;

CREATE INDEX IF NOT EXISTS idx_leave_approval_workflows_department_id
  ON public.leave_approval_workflows (department_id);

CREATE INDEX IF NOT EXISTS idx_leave_cancellation_workflows_department_id
  ON public.leave_cancellation_workflows (department_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_approval_workflows_global_role
  ON public.leave_approval_workflows (requester_role)
  WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_approval_workflows_department_role
  ON public.leave_approval_workflows (department_id, requester_role)
  WHERE department_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_cancellation_workflows_global_role
  ON public.leave_cancellation_workflows (requester_role)
  WHERE department_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leave_cancellation_workflows_department_role
  ON public.leave_cancellation_workflows (department_id, requester_role)
  WHERE department_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_leave_request_workflow_snapshot(_employee_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  resolved_requester_role public.app_role := 'employee'::public.app_role;
  employee_department_id UUID;
  configured_workflow TEXT[];
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
  WHERE w.requester_role = resolved_requester_role
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

  IF coalesce(array_length(configured_workflow, 1), 0) > 0 THEN
    RETURN ARRAY(
      SELECT stage
      FROM unnest(ARRAY['manager', 'general_manager', 'director']::TEXT[]) AS stage
      WHERE stage = ANY(configured_workflow)
    );
  END IF;

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
  WHERE w.requester_role = requester_role_value
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
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_approval_workflows;
ANALYZE public.leave_cancellation_workflows;
