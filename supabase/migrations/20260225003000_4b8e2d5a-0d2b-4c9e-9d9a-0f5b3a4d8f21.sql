-- Revamp leave approval workflows to department-based profiles (single shared route per department)
-- Keep schema backward-compatible by retaining requester_role column and using requester_role='employee' as the canonical row.

DO $$
DECLARE
  scope_row record;
BEGIN
  -- Ensure one canonical approval workflow row exists per scope (global + department), using
  -- the best available legacy row if an employee-scoped row is missing.
  FOR scope_row IN
    SELECT DISTINCT department_id
    FROM public.leave_approval_workflows
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.leave_approval_workflows w
      WHERE w.requester_role = 'employee'
        AND w.department_id IS NOT DISTINCT FROM scope_row.department_id
    ) THEN
      INSERT INTO public.leave_approval_workflows (
        requester_role,
        department_id,
        approval_stages,
        is_active,
        notes
      )
      SELECT
        'employee',
        scope_row.department_id,
        w.approval_stages,
        coalesce(w.is_active, true),
        coalesce(w.notes, 'Migrated from legacy requester-role workflow profile')
      FROM public.leave_approval_workflows w
      WHERE w.department_id IS NOT DISTINCT FROM scope_row.department_id
      ORDER BY
        CASE w.requester_role
          WHEN 'employee' THEN 0
          WHEN 'manager' THEN 1
          WHEN 'general_manager' THEN 2
          WHEN 'director' THEN 3
          WHEN 'hr' THEN 4
          WHEN 'admin' THEN 5
          ELSE 6
        END,
        w.created_at ASC
      LIMIT 1;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_approval_workflows
    WHERE requester_role = 'employee'
      AND department_id IS NULL
  ) THEN
    INSERT INTO public.leave_approval_workflows (
      requester_role,
      department_id,
      approval_stages,
      is_active,
      notes
    ) VALUES (
      'employee',
      NULL,
      ARRAY['manager', 'general_manager', 'director']::text[],
      true,
      'Default global department approval route'
    );
  END IF;

  -- Repeat the same normalization for cancellation workflows.
  FOR scope_row IN
    SELECT DISTINCT department_id
    FROM public.leave_cancellation_workflows
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.leave_cancellation_workflows w
      WHERE w.requester_role = 'employee'
        AND w.department_id IS NOT DISTINCT FROM scope_row.department_id
    ) THEN
      INSERT INTO public.leave_cancellation_workflows (
        requester_role,
        department_id,
        approval_stages,
        is_active,
        notes
      )
      SELECT
        'employee',
        scope_row.department_id,
        w.approval_stages,
        coalesce(w.is_active, true),
        coalesce(w.notes, 'Migrated from legacy requester-role cancellation workflow profile')
      FROM public.leave_cancellation_workflows w
      WHERE w.department_id IS NOT DISTINCT FROM scope_row.department_id
      ORDER BY
        CASE w.requester_role
          WHEN 'employee' THEN 0
          WHEN 'manager' THEN 1
          WHEN 'general_manager' THEN 2
          WHEN 'director' THEN 3
          WHEN 'hr' THEN 4
          WHEN 'admin' THEN 5
          ELSE 6
        END,
        w.created_at ASC
      LIMIT 1;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_cancellation_workflows
    WHERE requester_role = 'employee'
      AND department_id IS NULL
  ) THEN
    INSERT INTO public.leave_cancellation_workflows (
      requester_role,
      department_id,
      approval_stages,
      is_active,
      notes
    ) VALUES (
      'employee',
      NULL,
      ARRAY['manager', 'general_manager', 'director']::text[],
      true,
      'Default global department cancellation route'
    );
  END IF;
END;
$$;

-- Remove legacy requester-role-specific workflow rows. The app and DB now use the employee row
-- as the shared department workflow profile.
DELETE FROM public.leave_approval_workflows
WHERE requester_role <> 'employee';

DELETE FROM public.leave_cancellation_workflows
WHERE requester_role <> 'employee';

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
REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID, TEXT) TO authenticated, service_role;

ANALYZE public.leave_approval_workflows;
ANALYZE public.leave_cancellation_workflows;
