\echo 'Running state-machine SQL regression checks...'

DO $$
DECLARE
  has_normalize_trigger boolean := false;
BEGIN
  -- Department-based workflow model schema and canonical row shape.
  IF EXISTS (
    SELECT 1
    FROM public.leave_approval_workflows
    WHERE requester_role <> 'employee'
  ) THEN
    RAISE EXCEPTION 'leave_approval_workflows still contains legacy requester-role rows.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.leave_cancellation_workflows
    WHERE requester_role <> 'employee'
  ) THEN
    RAISE EXCEPTION 'leave_cancellation_workflows still contains legacy requester-role rows.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leave_approval_workflows
    WHERE requester_role = 'employee' AND department_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Global default row missing in leave_approval_workflows (employee profile).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.leave_cancellation_workflows
    WHERE requester_role = 'employee' AND department_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Global default row missing in leave_cancellation_workflows (employee profile).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_approval_workflows' AND column_name = 'department_id'
  ) THEN
    RAISE EXCEPTION 'leave_approval_workflows.department_id column is missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leave_cancellation_workflows' AND column_name = 'department_id'
  ) THEN
    RAISE EXCEPTION 'leave_cancellation_workflows.department_id column is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND (
        (t.relname = 'leave_approval_workflows' AND c.conname = 'leave_approval_workflows_requester_role_key')
        OR (t.relname = 'leave_cancellation_workflows' AND c.conname = 'leave_cancellation_workflows_requester_role_key')
      )
  ) THEN
    RAISE EXCEPTION 'Legacy requester_role unique constraints should be removed from workflow tables.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'leave_approval_workflows' AND indexname = 'uq_leave_approval_workflows_global_role')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'leave_approval_workflows' AND indexname = 'uq_leave_approval_workflows_department_role')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'leave_cancellation_workflows' AND indexname = 'uq_leave_cancellation_workflows_global_role')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'leave_cancellation_workflows' AND indexname = 'uq_leave_cancellation_workflows_department_role')
  THEN
    RAISE EXCEPTION 'Department-scoped workflow unique indexes are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leave_requests'
      AND column_name = 'cancellation_status'
  ) THEN
    RAISE EXCEPTION 'leave_requests.cancellation_status column is missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'leave_requests'
      AND c.conname = 'leave_requests_cancellation_status_check'
      AND pg_get_constraintdef(c.oid) ILIKE '%cancellation_status%'
      AND pg_get_constraintdef(c.oid) ILIKE '%approved%'
      AND pg_get_constraintdef(c.oid) ILIKE '%rejected%'
  ) THEN
    RAISE EXCEPTION 'leave_requests_cancellation_status_check missing or malformed.';
  END IF;

  -- Phase 4B normalization + enforcement trigger chain is present and hardened.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_requests'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzx_normalize_leave_request_resubmission'
  ) THEN
    RAISE EXCEPTION 'Missing zzx_normalize_leave_request_resubmission trigger on public.leave_requests.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'normalize_leave_request_resubmission'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'normalize_leave_request_resubmission missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_requests'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzy_normalize_leave_request_state'
  ) INTO has_normalize_trigger;
  IF NOT has_normalize_trigger THEN
    RAISE EXCEPTION 'Missing zzy_normalize_leave_request_state trigger on public.leave_requests.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'normalize_leave_request_state'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'normalize_leave_request_state missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_requests'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzz0_enforce_leave_request_transition_sequencing'
  ) THEN
    RAISE EXCEPTION 'Missing zzz0_enforce_leave_request_transition_sequencing trigger on public.leave_requests.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'enforce_leave_request_transition_sequencing'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'enforce_leave_request_transition_sequencing missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_requests'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzz_enforce_leave_request_state_consistency'
  ) THEN
    RAISE EXCEPTION 'Missing zzz_enforce_leave_request_state_consistency trigger on public.leave_requests.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'enforce_leave_request_state_consistency'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'Leave request state consistency function missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_requests'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzzz_log_leave_request_events'
  ) THEN
    RAISE EXCEPTION 'Missing zzzz_log_leave_request_events trigger on public.leave_requests.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_leave_request_events'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'log_leave_request_events missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;
END;
$$;

BEGIN;

DO $$
DECLARE
  dept_a_id uuid := '20000000-0000-0000-0000-000000000001';
  dept_b_id uuid := '20000000-0000-0000-0000-000000000002';
  user_a_id uuid := '30000000-0000-0000-0000-000000000001';
  user_b_id uuid := '31110000-0000-0000-0000-000000000002';
  user_manager_id uuid := '32220000-0000-0000-0000-000000000003';
  leave_type_id uuid := '40000000-0000-0000-0000-000000000001';
  request_a_id uuid := '50000000-0000-0000-0000-000000000001';
  request_b_id uuid := '50000000-0000-0000-0000-000000000002';
  request_manager_id uuid := '50000000-0000-0000-0000-000000000003';
  resolved_route text[];
  cancellation_result text;
  cancellation_route text[];
BEGIN
  -- Isolated fixture setup (rolled back after this block).
  INSERT INTO public.departments (id, name, description)
  VALUES
    (dept_a_id, 'ZZ_STATE_TEST_DEPT_A', 'State regression test dept A'),
    (dept_b_id, 'ZZ_STATE_TEST_DEPT_B', 'State regression test dept B');

  INSERT INTO auth.users (
    id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at
  )
  VALUES
    (user_a_id, 'authenticated', 'authenticated', 'zz_state_dept_a@example.com', '{}'::jsonb, now(), now(), now()),
    (user_b_id, 'authenticated', 'authenticated', 'zz_state_dept_b@example.com', '{}'::jsonb, now(), now(), now()),
    (user_manager_id, 'authenticated', 'authenticated', 'zz_state_dept_mgr@example.com', '{}'::jsonb, now(), now(), now());

  UPDATE public.profiles
  SET department_id = dept_a_id, first_name = 'Dept', last_name = 'Alpha'
  WHERE id = user_a_id;

  UPDATE public.profiles
  SET department_id = dept_b_id, first_name = 'Dept', last_name = 'Beta'
  WHERE id = user_b_id;

  UPDATE public.profiles
  SET department_id = dept_a_id, first_name = 'Dept', last_name = 'Manager'
  WHERE id = user_manager_id;

  UPDATE public.user_roles
  SET role = 'manager'
  WHERE user_id = user_manager_id;

  INSERT INTO public.leave_types (id, name, description, days_allowed, is_paid)
  VALUES (leave_type_id, 'ZZ_STATE_TEST_LEAVE_TYPE', 'State regression leave type', 30, true);

  -- Approval workflow resolution: department-specific row overrides global row; other departments fall back.
  UPDATE public.leave_approval_workflows
  SET approval_stages = ARRAY['manager', 'general_manager', 'director']::text[],
      is_active = true,
      notes = 'state regression global approval route'
  WHERE requester_role = 'employee'
    AND department_id IS NULL;

  INSERT INTO public.leave_approval_workflows (requester_role, department_id, approval_stages, is_active, notes)
  VALUES ('employee', dept_a_id, ARRAY['manager', 'director']::text[], true, 'state regression dept override approval route');

  resolved_route := public.resolve_leave_request_workflow_snapshot(user_a_id);
  IF resolved_route IS DISTINCT FROM ARRAY['manager', 'director']::text[] THEN
    RAISE EXCEPTION 'Department-specific approval workflow route not selected. Got: %', resolved_route;
  END IF;

  resolved_route := public.resolve_leave_request_workflow_snapshot(user_manager_id);
  IF resolved_route IS DISTINCT FROM ARRAY['director']::text[] THEN
    RAISE EXCEPTION 'Shared department approval workflow was not adapted for manager requester. Got: %', resolved_route;
  END IF;

  resolved_route := public.resolve_leave_request_workflow_snapshot(user_b_id);
  IF resolved_route IS DISTINCT FROM ARRAY['manager', 'general_manager', 'director']::text[] THEN
    RAISE EXCEPTION 'Global approval workflow fallback not selected. Got: %', resolved_route;
  END IF;

  -- Cancellation workflow resolution via request_leave_cancellation RPC: department-specific row overrides global row.
  UPDATE public.leave_cancellation_workflows
  SET approval_stages = ARRAY['general_manager', 'director']::text[],
      is_active = true,
      notes = 'state regression global cancellation route'
  WHERE requester_role = 'employee'
    AND department_id IS NULL;

  INSERT INTO public.leave_cancellation_workflows (requester_role, department_id, approval_stages, is_active, notes)
  VALUES ('employee', dept_a_id, ARRAY['manager']::text[], true, 'state regression dept override cancellation route');

  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    manager_approved_at, manager_approved_by,
    gm_approved_at, gm_approved_by,
    director_approved_at, director_approved_by,
    final_approved_at, final_approved_by, final_approved_by_role
  )
  VALUES
    (
      request_a_id,
      user_a_id,
      leave_type_id,
      CURRENT_DATE + 10,
      CURRENT_DATE + 10,
      1,
      'State dept cancellation test A',
      'director_approved',
      now() - interval '2 days',
      user_a_id,
      NULL,
      NULL,
      now(),
      user_a_id,
      now(),
      user_a_id,
      'director'
    ),
    (
      request_b_id,
      user_b_id,
      leave_type_id,
      CURRENT_DATE + 12,
      CURRENT_DATE + 12,
      1,
      'State dept cancellation test B',
      'director_approved',
      now() - interval '3 days',
      user_b_id,
      now() - interval '2 days',
      user_b_id,
      now(),
      user_b_id,
      now(),
      user_b_id,
      'director'
    ),
    (
      request_manager_id,
      user_manager_id,
      leave_type_id,
      CURRENT_DATE + 14,
      CURRENT_DATE + 14,
      1,
      'State dept cancellation test Manager',
      'director_approved',
      NULL,
      NULL,
      NULL,
      NULL,
      now(),
      user_manager_id,
      now(),
      user_manager_id,
      'director'
    );

  PERFORM set_config('request.jwt.claim.sub', user_a_id::text, true);
  cancellation_result := public.request_leave_cancellation(request_a_id, 'Dept-specific cancellation workflow test');
  IF cancellation_result <> 'requested' THEN
    RAISE EXCEPTION 'Unexpected cancellation RPC result for dept-specific route: %', cancellation_result;
  END IF;

  SELECT cancellation_route_snapshot
  INTO cancellation_route
  FROM public.leave_requests
  WHERE id = request_a_id;

  IF cancellation_route IS DISTINCT FROM ARRAY['manager']::text[] THEN
    RAISE EXCEPTION 'Department-specific cancellation workflow route not selected. Got: %', cancellation_route;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', user_b_id::text, true);
  cancellation_result := public.request_leave_cancellation(request_b_id, 'Global fallback cancellation workflow test');
  IF cancellation_result <> 'requested' THEN
    RAISE EXCEPTION 'Unexpected cancellation RPC result for fallback route: %', cancellation_result;
  END IF;

  SELECT cancellation_route_snapshot
  INTO cancellation_route
  FROM public.leave_requests
  WHERE id = request_b_id;

  IF cancellation_route IS DISTINCT FROM ARRAY['general_manager', 'director']::text[] THEN
    RAISE EXCEPTION 'Global cancellation workflow fallback not selected. Got: %', cancellation_route;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', user_manager_id::text, true);
  cancellation_result := public.request_leave_cancellation(request_manager_id, 'Manager requester cancellation route adaptation');
  IF cancellation_result <> 'requested' THEN
    RAISE EXCEPTION 'Unexpected cancellation RPC result for manager requester route adaptation: %', cancellation_result;
  END IF;

  SELECT cancellation_route_snapshot
  INTO cancellation_route
  FROM public.leave_requests
  WHERE id = request_manager_id;

  IF cancellation_route IS DISTINCT FROM ARRAY['general_manager', 'director']::text[] THEN
    RAISE EXCEPTION 'Shared department cancellation workflow was not adapted for manager requester. Got: %', cancellation_route;
  END IF;
END;
$$;

ROLLBACK;

BEGIN;

DO $$
DECLARE
  emp_id uuid := '90110000-0000-0000-0000-000000000001';
  manager_id uuid := '90120000-0000-0000-0000-000000000002';
  gm_id uuid := '90130000-0000-0000-0000-000000000003';
  director_id uuid := '90140000-0000-0000-0000-000000000004';
  admin_id uuid := '90150000-0000-0000-0000-000000000005';
  leave_type_id uuid := '90000000-0000-0000-0000-000000000003';
  request_id uuid := '90000000-0000-0000-0000-000000000004';
  normalized_request_id uuid := '90000000-0000-0000-0000-000000000005';
  manager_final_request_id uuid := '90000000-0000-0000-0000-000000000006';
  legacy_cancelled_request_id uuid := '90000000-0000-0000-0000-000000000007';
  rejected_resubmit_request_id uuid := '90000000-0000-0000-0000-000000000008';
  pending_doc_amend_request_id uuid := '90000000-0000-0000-0000-000000000009';
  rpc_rejected_request_id uuid := '90000000-0000-0000-0000-00000000000a';
  now_ts timestamptz := now();
  err_msg text;
  approval_route text[];
  cancellation_route text[];
  manager_comments_val text;
  amendment_notes_val text;
  cancellation_reason_val text;
  cancellation_status_val text;
  document_required_val boolean;
  event_count int;
  queue_count int;
  retention_result jsonb;
  claimed_queue_id uuid;
  claimed_queue_status text;
  claimed_attempts int;
  claimed_leased_by text;
  finalized_status text;
  retry_next_attempt_at timestamptz;
  retry_last_error text;
  queue_summary jsonb;
  queue_list_count int;
  queue_ops_test_id uuid := '90000000-0000-0000-0000-0000000000f1';
  queue_ops_row_id uuid;
  queue_ops_row_status text;
  queue_ops_last_error text;
  masked_employee_identifier text;
  masked_phone_value text;
  director_visible_employee_identifier text;
  director_visible_phone_value text;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at
  )
  VALUES
    (emp_id, 'authenticated', 'authenticated', 'zz_phase4b_emp@example.com', '{}'::jsonb, now(), now(), now()),
    (manager_id, 'authenticated', 'authenticated', 'zz_phase4b_mgr@example.com', '{}'::jsonb, now(), now(), now()),
    (gm_id, 'authenticated', 'authenticated', 'zz_phase4b_gm@example.com', '{}'::jsonb, now(), now(), now()),
    (director_id, 'authenticated', 'authenticated', 'zz_phase4b_director@example.com', '{}'::jsonb, now(), now(), now()),
    (admin_id, 'authenticated', 'authenticated', 'zz_phase4b_admin@example.com', '{}'::jsonb, now(), now(), now());

  UPDATE public.user_roles SET role = 'employee' WHERE user_id = emp_id;
  UPDATE public.user_roles SET role = 'manager' WHERE user_id = manager_id;
  UPDATE public.user_roles SET role = 'general_manager' WHERE user_id = gm_id;
  UPDATE public.user_roles SET role = 'director' WHERE user_id = director_id;
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;

  UPDATE public.profiles
  SET employee_id = 'ZZ-PHASE4B-EMP-001',
      phone = '+60123456789'
  WHERE id = emp_id;

  INSERT INTO public.leave_types (id, name, description, days_allowed, is_paid)
  VALUES (leave_type_id, 'ZZ_PHASE4B_LEAVE_TYPE', 'Phase 4B state-machine test leave type', 30, true);

  -- DB-side normalization: canonicalize routes, trim optional strings, and null empty optional strings.
  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot, manager_comments, amendment_notes, cancellation_reason
  )
  VALUES (
    normalized_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 18,
    CURRENT_DATE + 18,
    1,
    '  Normalize me  ',
    'pending',
    ARRAY['director','manager','manager','invalid_stage']::text[],
    '   ',
    '  retained note  ',
    '   '
  );

  SELECT approval_route_snapshot,
         manager_comments,
         amendment_notes,
         cancellation_reason
  INTO approval_route, manager_comments_val, amendment_notes_val, cancellation_reason_val
  FROM public.leave_requests
  WHERE id = normalized_request_id;

  IF approval_route IS DISTINCT FROM ARRAY['manager','director']::text[] THEN
    RAISE EXCEPTION 'approval_route_snapshot was not canonicalized by normalize trigger. Got: %', approval_route;
  END IF;
  IF manager_comments_val IS NOT NULL THEN
    RAISE EXCEPTION 'manager_comments empty-string normalization failed. Got: %', manager_comments_val;
  END IF;
  IF amendment_notes_val IS DISTINCT FROM 'retained note' THEN
    RAISE EXCEPTION 'amendment_notes trim normalization failed. Got: %', amendment_notes_val;
  END IF;
  IF cancellation_reason_val IS NOT NULL THEN
    RAISE EXCEPTION 'cancellation_reason empty-string normalization failed. Got: %', cancellation_reason_val;
  END IF;

  -- Base final-approved request for invalid/valid transition tests.
  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot,
    manager_approved_by, manager_approved_at,
    director_approved_by, director_approved_at,
    final_approved_at, final_approved_by, final_approved_by_role
  )
  VALUES (
    request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 20,
    CURRENT_DATE + 20,
    1,
    'Phase 4 invariant test request',
    'director_approved',
    ARRAY['manager','director']::text[],
    manager_id,
    now_ts - interval '2 days',
    director_id,
    now_ts - interval '1 day',
    now_ts - interval '1 day',
    director_id,
    'director'
  );

  -- Legacy approved-then-cancelled rows should be normalized into explicit cancellation state, including stage stamps.
  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot,
    manager_approved_by, manager_approved_at,
    final_approved_at, final_approved_by, final_approved_by_role,
    cancelled_at, cancelled_by, cancelled_by_role,
    cancellation_status,
    cancellation_route_snapshot
  )
  VALUES (
    legacy_cancelled_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 40,
    CURRENT_DATE + 40,
    1,
    'Legacy cancelled normalization test',
    'cancelled',
    ARRAY['invalid_stage','manager','manager']::text[],
    manager_id,
    now_ts - interval '6 days',
    now_ts - interval '5 days',
    manager_id,
    'manager',
    now_ts - interval '4 days',
    manager_id,
    'manager',
    NULL,
    NULL
  );

  SELECT cancellation_status,
         cancellation_route_snapshot
  INTO cancellation_status_val, cancellation_route
  FROM public.leave_requests
  WHERE id = legacy_cancelled_request_id;

  IF cancellation_status_val IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Legacy cancelled row was not normalized to cancellation_status=approved. Got: %', cancellation_status_val;
  END IF;
  IF cancellation_route IS DISTINCT FROM ARRAY['manager']::text[] THEN
    RAISE EXCEPTION 'Legacy cancelled row cancellation_route_snapshot normalization failed. Got: %', cancellation_route;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE id = legacy_cancelled_request_id
      AND cancellation_manager_approved_at IS NOT NULL
      AND cancellation_manager_approved_by = manager_id
      AND cancellation_final_approved_by_role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Legacy cancelled row did not receive normalized manager cancellation approval stamps.';
  END IF;

  -- Invalid transition tests (generic + route-aware).
  BEGIN
    UPDATE public.leave_requests
    SET final_approved_by = NULL
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected state invariant violation (final approval triplet mismatch) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    INSERT INTO public.leave_requests (
      employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
      approval_route_snapshot, cancellation_status, cancellation_route_snapshot,
      cancellation_requested_at, cancellation_requested_by
    )
    VALUES (
      emp_id, leave_type_id, CURRENT_DATE + 21, CURRENT_DATE + 21, 1,
      'Invalid cancellation-on-pending test', 'pending',
      ARRAY['manager','director']::text[],
      'pending',
      ARRAY['manager','director']::text[],
      now_ts, emp_id
    );
    RAISE EXCEPTION 'Expected state invariant violation (cancellation workflow on non-final leave) but insert succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET cancellation_status = 'approved',
        cancellation_route_snapshot = ARRAY['manager','director']::text[],
        cancellation_requested_at = now_ts,
        cancellation_requested_by = emp_id,
        cancellation_final_approved_at = now_ts,
        cancellation_final_approved_by = director_id,
        cancellation_final_approved_by_role = 'director'
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected state invariant violation (cancellation approved without cancelled status) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancellation_status = 'approved',
        cancellation_route_snapshot = ARRAY['manager','director']::text[],
        cancellation_requested_at = now_ts,
        cancellation_requested_by = emp_id,
        cancellation_final_approved_at = now_ts,
        cancellation_final_approved_by = director_id,
        cancellation_final_approved_by_role = 'director',
        cancelled_at = NULL,
        cancelled_by = NULL,
        cancelled_by_role = NULL
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected state invariant violation (cancelled leave missing cancellation stamps) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET cancellation_status = NULL,
        cancellation_reason = 'stale reason'
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected state invariant violation (stale cancellation fields with NULL status) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET approval_route_snapshot = ARRAY['director']::text[],
        manager_approved_at = now_ts,
        manager_approved_by = manager_id
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected route-aware violation (manager stamps on route excluding manager) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%route that excludes manager%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    INSERT INTO public.leave_requests (
      employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
      approval_route_snapshot,
      manager_approved_by, manager_approved_at
    )
    VALUES (
      emp_id, leave_type_id, CURRENT_DATE + 22, CURRENT_DATE + 22, 1,
      'Invalid final-stage-without-final-triplet test',
      'manager_approved',
      ARRAY['manager']::text[],
      manager_id,
      now_ts
    );
    RAISE EXCEPTION 'Expected route-aware violation (final route stage without final approval metadata) but insert succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%requires final approval metadata%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    INSERT INTO public.leave_requests (
      employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
      approval_route_snapshot,
      manager_approved_by, manager_approved_at,
      final_approved_at, final_approved_by, final_approved_by_role
    )
    VALUES (
      emp_id, leave_type_id, CURRENT_DATE + 23, CURRENT_DATE + 23, 1,
      'Invalid non-final-stage-with-final-triplet test',
      'manager_approved',
      ARRAY['manager','director']::text[],
      manager_id,
      now_ts,
      now_ts,
      manager_id,
      'manager'
    );
    RAISE EXCEPTION 'Expected route-aware violation (final approval metadata on non-final route stage) but insert succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%may only be set when status matches the route final stage%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET cancellation_status = 'manager_approved',
        cancellation_route_snapshot = ARRAY['manager']::text[],
        cancellation_requested_at = now_ts,
        cancellation_requested_by = emp_id,
        cancellation_reason = 'invalid final-stage cancellation representation',
        cancellation_manager_approved_at = now_ts,
        cancellation_manager_approved_by = manager_id
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected route-aware violation (final cancellation stage represented as manager_approved) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%final cancellation stage must be represented by cancellation_status=approved%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET status = 'cancelled',
        cancellation_status = 'approved',
        cancellation_route_snapshot = ARRAY['manager']::text[],
        cancellation_requested_at = now_ts,
        cancellation_requested_by = emp_id,
        cancellation_reason = 'invalid cancellation final role mismatch',
        cancellation_manager_approved_at = now_ts,
        cancellation_manager_approved_by = manager_id,
        cancellation_final_approved_at = now_ts,
        cancellation_final_approved_by = director_id,
        cancellation_final_approved_by_role = 'director',
        cancelled_at = now_ts,
        cancelled_by = director_id,
        cancelled_by_role = 'director'
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected route-aware violation (cancellation final role mismatch) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests state invariant:%must match the route final stage role%' THEN
        RAISE;
      END IF;
  END;

  -- Phase 4C: transition sequencing and amendment/resubmit edge cases.
  BEGIN
    UPDATE public.leave_requests
    SET status = 'pending'
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected transition invariant violation (final-approved -> pending rollback) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests transition invariant:%final-approved leave cannot be resubmitted to pending%' THEN
        RAISE;
      END IF;
  END;

  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot,
    manager_approved_by, manager_approved_at,
    rejected_by, rejected_at, rejection_reason,
    document_required, manager_comments
  )
  VALUES (
    rpc_rejected_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 24,
    CURRENT_DATE + 24,
    1,
    'RPC rejected amendment source',
    'rejected',
    ARRAY['manager','director']::text[],
    manager_id,
    now_ts - interval '90 minutes',
    manager_id,
    now_ts - interval '30 minutes',
    'Attach corrected document',
    true,
    'Need revised supporting file'
  );

  BEGIN
    PERFORM set_config('request.jwt.claim.sub', manager_id::text, true);
    PERFORM public.amend_leave_request(
      rpc_rejected_request_id,
      'attempt by non-owner',
      NULL,
      NULL
    );
    RAISE EXCEPTION 'Expected amend_leave_request owner check failure but RPC succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'You can only amend your own leave requests%' THEN
        RAISE;
      END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', emp_id::text, true);
  PERFORM public.amend_leave_request(
    rpc_rejected_request_id,
    '  Resubmitting with corrected document via RPC  ',
    '  Updated leave reason via RPC  ',
    'https://example.test/docs/rpc-amendment.pdf'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE id = rpc_rejected_request_id
      AND status = 'pending'
      AND amendment_notes = 'Resubmitting with corrected document via RPC'
      AND reason = 'Updated leave reason via RPC'
      AND document_url = 'https://example.test/docs/rpc-amendment.pdf'
      AND rejected_at IS NULL
      AND rejected_by IS NULL
      AND rejection_reason IS NULL
      AND document_required = false
  ) THEN
    RAISE EXCEPTION 'amend_leave_request RPC did not produce the expected normalized pending row.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.leave_request_events
  WHERE leave_request_id = rpc_rejected_request_id
    AND event_type = 'leave_resubmitted';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'leave_request_events did not record leave_resubmitted for amend_leave_request RPC.';
  END IF;

  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot,
    manager_approved_by, manager_approved_at,
    rejected_by, rejected_at, rejection_reason
  )
  VALUES (
    rejected_resubmit_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 26,
    CURRENT_DATE + 26,
    1,
    'Rejected request to resubmit',
    'rejected',
    ARRAY['manager','director']::text[],
    manager_id,
    now_ts - interval '1 day',
    manager_id,
    now_ts - interval '1 hour',
    'Need supporting document'
  );

  BEGIN
    UPDATE public.leave_requests
    SET status = 'pending'
    WHERE id = rejected_resubmit_request_id;
    RAISE EXCEPTION 'Expected transition invariant violation (rejected -> pending without amendment metadata) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests transition invariant:%rejected leave resubmission requires amended_at and amendment_notes%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET status = 'pending',
        amended_at = now_ts,
        amendment_notes = '   '
    WHERE id = rejected_resubmit_request_id;
    RAISE EXCEPTION 'Expected transition invariant violation (blank amendment notes) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests transition invariant:%requires non-empty amendment_notes%' THEN
        RAISE;
      END IF;
  END;

  UPDATE public.leave_requests
  SET status = 'pending',
      amended_at = now_ts,
      amendment_notes = '  Added supporting document and corrected dates  ',
      document_url = 'https://example.test/docs/rejected-resubmit.pdf'
  WHERE id = rejected_resubmit_request_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE id = rejected_resubmit_request_id
      AND status = 'pending'
      AND amended_at = now_ts
      AND amendment_notes = 'Added supporting document and corrected dates'
      AND manager_approved_at IS NULL
      AND rejected_at IS NULL
      AND final_approved_at IS NULL
      AND cancellation_status IS NULL
  ) THEN
    RAISE EXCEPTION 'Rejected leave resubmission normalization/reset did not produce the expected pending state.';
  END IF;

  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot, document_required, manager_comments
  )
  VALUES (
    pending_doc_amend_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 27,
    CURRENT_DATE + 27,
    1,
    'Pending document request amendment',
    'pending',
    ARRAY['manager','director']::text[],
    true,
    'Please upload a valid medical certificate.'
  );

  UPDATE public.leave_requests
  SET status = 'pending',
      amended_at = now_ts + interval '1 minute',
      amendment_notes = '  Uploaded requested certificate  ',
      document_url = 'https://example.test/docs/requested-certificate.pdf'
  WHERE id = pending_doc_amend_request_id;

  SELECT amendment_notes, document_required
  INTO amendment_notes_val, document_required_val
  FROM public.leave_requests
  WHERE id = pending_doc_amend_request_id;

  IF amendment_notes_val IS DISTINCT FROM 'Uploaded requested certificate' THEN
    RAISE EXCEPTION 'Pending document amendment notes were not normalized/trimmed. Got: %', amendment_notes_val;
  END IF;
  IF document_required_val IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Pending document amendment should clear document_required when a document is attached.';
  END IF;

  BEGIN
    UPDATE public.leave_requests
    SET amended_at = now_ts + interval '30 seconds'
    WHERE id = pending_doc_amend_request_id;
    RAISE EXCEPTION 'Expected transition invariant violation (amended_at rollback) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests transition invariant:%amended_at must be monotonic%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    UPDATE public.leave_requests
    SET cancellation_status = 'manager_approved',
        cancellation_requested_at = now_ts,
        cancellation_requested_by = emp_id,
        cancellation_reason = 'Rollback test',
        cancellation_route_snapshot = ARRAY['manager','director']::text[],
        cancellation_manager_approved_at = now_ts,
        cancellation_manager_approved_by = manager_id
    WHERE id = request_id;

    UPDATE public.leave_requests
    SET cancellation_status = 'pending'
    WHERE id = request_id;
    RAISE EXCEPTION 'Expected transition invariant violation (cancellation stage rollback) but update succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      IF err_msg NOT LIKE 'leave_requests transition invariant:%cancellation workflow stage rollback is not allowed%' THEN
        RAISE;
      END IF;
  END;

  -- Valid route-aware states.
  INSERT INTO public.leave_requests (
    id, employee_id, leave_type_id, start_date, end_date, days_count, reason, status,
    approval_route_snapshot,
    manager_approved_by, manager_approved_at,
    final_approved_at, final_approved_by, final_approved_by_role
  )
  VALUES (
    manager_final_request_id,
    emp_id,
    leave_type_id,
    CURRENT_DATE + 25,
    CURRENT_DATE + 25,
    1,
    'Manager-final route valid request',
    'manager_approved',
    ARRAY['manager']::text[],
    manager_id,
    now_ts,
    now_ts,
    manager_id,
    'manager'
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.leave_requests
    WHERE id = manager_final_request_id
      AND status = 'manager_approved'
      AND final_approved_by_role = 'manager'
  ) THEN
    RAISE EXCEPTION 'Valid manager-final approval route insert failed unexpectedly.';
  END IF;

  UPDATE public.leave_requests
  SET cancellation_status = 'pending',
      cancellation_route_snapshot = ARRAY['director','manager','manager','unknown']::text[],
      cancellation_requested_at = now_ts,
      cancellation_requested_by = emp_id,
      cancellation_reason = '  Phase 4B valid cancellation request  '
  WHERE id = request_id;

  SELECT cancellation_route_snapshot, cancellation_reason
  INTO cancellation_route, cancellation_reason_val
  FROM public.leave_requests
  WHERE id = request_id;

  IF cancellation_route IS DISTINCT FROM ARRAY['manager','director']::text[] THEN
    RAISE EXCEPTION 'cancellation_route_snapshot was not canonicalized by normalize trigger. Got: %', cancellation_route;
  END IF;
  IF cancellation_reason_val IS DISTINCT FROM 'Phase 4B valid cancellation request' THEN
    RAISE EXCEPTION 'cancellation_reason trim normalization failed. Got: %', cancellation_reason_val;
  END IF;

  -- Audit/event groundwork: trigger should log key leave/cancellation transitions.
  SELECT count(*)
  INTO event_count
  FROM public.leave_request_events
  WHERE leave_request_id = rejected_resubmit_request_id
    AND event_type = 'leave_amended';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'leave_request_events did not record leave_amended for rejected resubmission.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.leave_request_events
  WHERE leave_request_id = rejected_resubmit_request_id
    AND event_type = 'leave_resubmitted';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'leave_request_events did not record leave_resubmitted for rejected resubmission.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.leave_request_events
  WHERE leave_request_id = pending_doc_amend_request_id
    AND event_type = 'leave_document_attached';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'leave_request_events did not record leave_document_attached for pending doc amendment.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.leave_request_events
  WHERE leave_request_id = request_id
    AND event_type = 'leave_cancellation_requested';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'leave_request_events did not record leave_cancellation_requested.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.user_notifications
  WHERE leave_request_id = request_id
    AND event_type = 'leave_cancellation_requested';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'user_notifications did not record notifications for leave_cancellation_requested.';
  END IF;

  -- Phase 7 workflow config audit + notifications: privileged workflow change should be logged and notify other supervisors.
  PERFORM set_config('request.jwt.claim.sub', director_id::text, true);

  UPDATE public.leave_approval_workflows
  SET notes = 'Phase 7 workflow audit test update'
  WHERE id = (
    SELECT id
    FROM public.leave_approval_workflows
    WHERE requester_role = 'employee'
      AND department_id IS NULL
    LIMIT 1
  );

  SELECT count(*)
  INTO event_count
  FROM public.workflow_config_events
  WHERE workflow_type = 'leave_approval'
    AND action = 'updated'
    AND changed_by_user_id = director_id;
  IF event_count < 1 THEN
    RAISE EXCEPTION 'workflow_config_events did not record leave approval workflow update.';
  END IF;

  SELECT count(*)
  INTO event_count
  FROM public.user_notifications
  WHERE user_id = admin_id
    AND category = 'admin'
    AND source_table = 'workflow_config_events';
  IF event_count < 1 THEN
    RAISE EXCEPTION 'user_notifications did not notify admin for workflow config change.';
  END IF;

  -- Phase 7 mark read/unread RPCs should toggle owner notification state.
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  UPDATE public.user_notifications
  SET read_at = NULL
  WHERE user_id = admin_id
    AND category = 'admin';

  SELECT id
  INTO request_id
  FROM public.user_notifications
  WHERE user_id = admin_id
    AND category = 'admin'
  ORDER BY created_at DESC
  LIMIT 1;

  IF request_id IS NULL THEN
    RAISE EXCEPTION 'Expected an admin notification to test mark read/unread RPCs.';
  END IF;

  PERFORM public.mark_user_notifications_read(ARRAY[request_id]);

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE id = request_id
      AND user_id = admin_id
      AND read_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'mark_user_notifications_read did not mark notification as read.';
  END IF;

  PERFORM public.mark_user_notifications_unread(ARRAY[request_id]);

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE id = request_id
      AND user_id = admin_id
      AND read_at IS NULL
  ) THEN
    RAISE EXCEPTION 'mark_user_notifications_unread did not mark notification as unread.';
  END IF;

  -- Phase 7 optional: muted notification categories should suppress future notification inserts.
  INSERT INTO public.user_notification_preferences (user_id, admin_enabled)
  VALUES (admin_id, false)
  ON CONFLICT (user_id) DO UPDATE
    SET admin_enabled = EXCLUDED.admin_enabled;

  request_id := gen_random_uuid();
  INSERT INTO public.user_notifications (
    user_id,
    category,
    event_type,
    title,
    message,
    source_table,
    source_id
  )
  VALUES (
    admin_id,
    'admin',
    'phase7_preferences_suppressed',
    'Suppressed admin notification',
    'This notification should be suppressed by user preferences.',
    'state_machine_regression',
    request_id
  );

  IF EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE user_id = admin_id
      AND source_table = 'state_machine_regression'
      AND source_id = request_id
  ) THEN
    RAISE EXCEPTION 'Muted admin category did not suppress notification insert.';
  END IF;

  UPDATE public.user_notification_preferences
  SET admin_enabled = true
  WHERE user_id = admin_id;

  request_id := gen_random_uuid();
  INSERT INTO public.user_notifications (
    user_id,
    category,
    event_type,
    title,
    message,
    source_table,
    source_id
  )
  VALUES (
    admin_id,
    'admin',
    'phase7_preferences_unsuppressed',
    'Allowed admin notification',
    'This notification should be stored after re-enabling admin notifications.',
    'state_machine_regression',
    request_id
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_notifications
    WHERE user_id = admin_id
      AND source_table = 'state_machine_regression'
      AND source_id = request_id
  ) THEN
    RAISE EXCEPTION 'Re-enabled admin category did not restore notification inserts.';
  END IF;

  -- Optional Phase 7: cleanup RPC should delete old notifications for the caller only.
  request_id := '90000000-0000-0000-0000-0000000000b1';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, read_at, created_at
  )
  VALUES (
    request_id, admin_id, 'system', 'phase7_cleanup_old_read', 'Old read', 'Old read notification',
    'state_machine_cleanup', request_id, now() - interval '95 days', now() - interval '95 days'
  );

  PERFORM public.mark_user_notifications_unread(ARRAY[request_id]);
  UPDATE public.user_notifications
  SET read_at = now() - interval '90 days'
  WHERE id = request_id;

  manager_final_request_id := '90000000-0000-0000-0000-0000000000b2';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, read_at, created_at
  )
  VALUES (
    manager_final_request_id, admin_id, 'system', 'phase7_cleanup_old_unread', 'Old unread', 'Old unread notification',
    'state_machine_cleanup', manager_final_request_id, NULL, now() - interval '95 days'
  );

  legacy_cancelled_request_id := '90000000-0000-0000-0000-0000000000b3';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, read_at, created_at
  )
  VALUES (
    legacy_cancelled_request_id, admin_id, 'system', 'phase7_cleanup_recent_read', 'Recent read', 'Recent read notification',
    'state_machine_cleanup', legacy_cancelled_request_id, now() - interval '1 day', now() - interval '1 day'
  );

  event_count := public.delete_user_notifications(90, true);
  IF event_count < 1 THEN
    RAISE EXCEPTION 'delete_user_notifications(90,true) did not delete the old read notification.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_notifications WHERE id = request_id) THEN
    RAISE EXCEPTION 'delete_user_notifications(90,true) failed to delete old read notification.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE id = manager_final_request_id) THEN
    RAISE EXCEPTION 'delete_user_notifications(90,true) should not delete old unread notification.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE id = legacy_cancelled_request_id) THEN
    RAISE EXCEPTION 'delete_user_notifications(90,true) should not delete recent read notification.';
  END IF;

  event_count := public.delete_user_notifications(90, false);
  IF event_count < 1 THEN
    RAISE EXCEPTION 'delete_user_notifications(90,false) did not delete old unread notification.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_notifications WHERE id = manager_final_request_id) THEN
    RAISE EXCEPTION 'delete_user_notifications(90,false) failed to delete old unread notification.';
  END IF;

  -- Optional Phase 7: email delivery queue groundwork should enqueue only when email category preference is enabled.
  INSERT INTO public.user_notification_preferences (
    user_id,
    admin_enabled,
    email_admin_enabled
  )
  VALUES (admin_id, true, true)
  ON CONFLICT (user_id) DO UPDATE
    SET admin_enabled = EXCLUDED.admin_enabled,
        email_admin_enabled = EXCLUDED.email_admin_enabled;

  request_id := '90000000-0000-0000-0000-0000000000c1';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES (
    request_id, admin_id, 'admin', 'phase7_email_queue_enabled', 'Queue me', 'Email queue enabled',
    'state_machine_email_queue', request_id
  );

  SELECT count(*)
  INTO queue_count
  FROM public.notification_delivery_queue
  WHERE notification_id = request_id
    AND channel = 'email'
    AND status = 'pending';
  IF queue_count <> 1 THEN
    RAISE EXCEPTION 'Email delivery queue row was not created when email_admin_enabled=true.';
  END IF;

  UPDATE public.user_notification_preferences
  SET email_admin_enabled = false
  WHERE user_id = admin_id;

  manager_final_request_id := '90000000-0000-0000-0000-0000000000c2';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES (
    manager_final_request_id, admin_id, 'admin', 'phase7_email_queue_disabled', 'Do not queue', 'Email queue disabled',
    'state_machine_email_queue', manager_final_request_id
  );

  SELECT count(*)
  INTO queue_count
  FROM public.notification_delivery_queue
  WHERE notification_id = manager_final_request_id;
  IF queue_count <> 0 THEN
    RAISE EXCEPTION 'Email delivery queue row should not be created when email_admin_enabled=false.';
  END IF;

  -- Optional Phase 7: retention job should prune old read notifications and old queue rows by status.
  request_id := '90000000-0000-0000-0000-0000000000d1';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, read_at, created_at
  )
  VALUES (
    request_id, admin_id, 'system', 'phase7_retention_old_read', 'Retention old read', 'Old read notification for retention',
    'state_machine_retention', request_id, now() - interval '10 days', now() - interval '10 days'
  );

  normalized_request_id := '90000000-0000-0000-0000-0000000000d2';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, read_at, created_at
  )
  VALUES (
    normalized_request_id, admin_id, 'system', 'phase7_retention_recent_read', 'Retention recent read', 'Recent read notification for retention',
    'state_machine_retention', normalized_request_id, now() - interval '1 day', now() - interval '1 day'
  );

  rpc_rejected_request_id := '90000000-0000-0000-0000-0000000000d3';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, created_at
  )
  VALUES (
    rpc_rejected_request_id, admin_id, 'system', 'phase7_retention_queue_sent', 'Retention queue sent', 'Queue sent row for retention',
    'state_machine_retention', rpc_rejected_request_id, now() - interval '10 days'
  );

  INSERT INTO public.notification_delivery_queue (
    notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, sent_at, created_at, updated_at
  )
  VALUES (
    rpc_rejected_request_id, admin_id, 'email', 'system', 'phase7_retention_queue_sent',
    'zz_phase4b_admin@example.com', 'Sent queue row', 'Sent queue row body',
    '{}'::jsonb, 'sent', now() - interval '10 days', now() - interval '10 days', now() - interval '10 days'
  );

  pending_doc_amend_request_id := '90000000-0000-0000-0000-0000000000d4';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id, created_at
  )
  VALUES (
    pending_doc_amend_request_id, admin_id, 'system', 'phase7_retention_queue_failed', 'Retention queue failed', 'Queue failed row for retention',
    'state_machine_retention', pending_doc_amend_request_id, now() - interval '10 days'
  );

  INSERT INTO public.notification_delivery_queue (
    notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, failed_at, created_at, updated_at
  )
  VALUES (
    pending_doc_amend_request_id, admin_id, 'email', 'system', 'phase7_retention_queue_failed',
    'zz_phase4b_admin@example.com', 'Failed queue row', 'Failed queue row body',
    '{}'::jsonb, 'failed', now() - interval '10 days', now() - interval '10 days', now() - interval '10 days'
  );

  retention_result := public.run_notification_retention_job(7, 7, 7);

  IF coalesce((retention_result ->> 'deleted_read_notifications')::int, 0) < 1 THEN
    RAISE EXCEPTION 'run_notification_retention_job did not report deleting old read notifications.';
  END IF;
  IF coalesce((retention_result ->> 'deleted_sent_queue')::int, 0) < 1 THEN
    RAISE EXCEPTION 'run_notification_retention_job did not report deleting old sent queue rows.';
  END IF;
  IF coalesce((retention_result ->> 'deleted_failed_queue')::int, 0) < 1 THEN
    RAISE EXCEPTION 'run_notification_retention_job did not report deleting old failed queue rows.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_notifications WHERE id = request_id) THEN
    RAISE EXCEPTION 'run_notification_retention_job failed to delete old read notification.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_notifications WHERE id = normalized_request_id) THEN
    RAISE EXCEPTION 'run_notification_retention_job should not delete recent read notifications.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notification_delivery_queue WHERE notification_id = rpc_rejected_request_id) THEN
    RAISE EXCEPTION 'run_notification_retention_job failed to delete old sent queue rows.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notification_delivery_queue WHERE notification_id = pending_doc_amend_request_id) THEN
    RAISE EXCEPTION 'run_notification_retention_job failed to delete old failed queue rows.';
  END IF;

  -- Optional Phase 7: worker queue claim/finalize RPCs should claim pending rows and finalize outcomes safely.
  request_id := '90000000-0000-0000-0000-0000000000e1';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES (
    request_id, admin_id, 'system', 'phase7_worker_claim_sent', 'Worker claim sent', 'Worker claim/finalize sent path',
    'state_machine_worker', request_id
  );

  INSERT INTO public.notification_delivery_queue (
    notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, attempts, next_attempt_at
  )
  VALUES (
    request_id, admin_id, 'email', 'system', 'phase7_worker_claim_sent',
    'zz_phase4b_admin@example.com', 'Worker sent path', 'Worker sent path body',
    '{}'::jsonb, 'pending', 0, now() - interval '1 minute'
  )
  ON CONFLICT (notification_id, channel) DO UPDATE
    SET status = 'pending',
        attempts = 0,
        next_attempt_at = now() - interval '1 minute',
        leased_at = NULL,
        leased_by = NULL,
        sent_at = NULL,
        failed_at = NULL,
        last_error = NULL;

  SELECT q.id, q.status, q.attempts, q.leased_by
  INTO claimed_queue_id, claimed_queue_status, claimed_attempts, claimed_leased_by
  FROM public.notification_worker_claim_email_queue(5, 'phase7-test-worker', 300, 10) q
  WHERE q.notification_id = request_id
  LIMIT 1;

  IF claimed_queue_id IS NULL THEN
    RAISE EXCEPTION 'notification_worker_claim_email_queue did not claim expected pending queue row.';
  END IF;
  IF claimed_queue_status IS DISTINCT FROM 'processing' THEN
    RAISE EXCEPTION 'Claimed queue row should be processing. Got: %', claimed_queue_status;
  END IF;
  IF claimed_attempts <> 1 THEN
    RAISE EXCEPTION 'Claimed queue row attempts should increment to 1. Got: %', claimed_attempts;
  END IF;
  IF claimed_leased_by IS DISTINCT FROM 'phase7-test-worker' THEN
    RAISE EXCEPTION 'Claimed queue row lease owner mismatch. Got: %', claimed_leased_by;
  END IF;

  SELECT (public.notification_worker_finalize_email_queue_item(
    claimed_queue_id,
    'sent',
    'phase7-test-worker',
    NULL,
    300
  )).status
  INTO finalized_status;

  IF finalized_status IS DISTINCT FROM 'sent' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item sent path failed. Got: %', finalized_status;
  END IF;

  manager_final_request_id := '90000000-0000-0000-0000-0000000000e2';
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES (
    manager_final_request_id, admin_id, 'system', 'phase7_worker_claim_failed', 'Worker claim failed', 'Worker claim/finalize failed path',
    'state_machine_worker', manager_final_request_id
  );

  INSERT INTO public.notification_delivery_queue (
    notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, attempts, next_attempt_at
  )
  VALUES (
    manager_final_request_id, admin_id, 'email', 'system', 'phase7_worker_claim_failed',
    'zz_phase4b_admin@example.com', 'Worker failed path', 'Worker failed path body',
    '{}'::jsonb, 'pending', 0, now() - interval '1 minute'
  )
  ON CONFLICT (notification_id, channel) DO UPDATE
    SET status = 'pending',
        attempts = 0,
        next_attempt_at = now() - interval '1 minute',
        leased_at = NULL,
        leased_by = NULL,
        sent_at = NULL,
        failed_at = NULL,
        last_error = NULL;

  SELECT q.id
  INTO claimed_queue_id
  FROM public.notification_worker_claim_email_queue(5, 'phase7-test-worker', 300, 10) q
  WHERE q.notification_id = manager_final_request_id
  LIMIT 1;

  IF claimed_queue_id IS NULL THEN
    RAISE EXCEPTION 'notification_worker_claim_email_queue did not claim failed-path queue row.';
  END IF;

  SELECT q.status, q.next_attempt_at, q.last_error
  INTO finalized_status, retry_next_attempt_at, retry_last_error
  FROM public.notification_worker_finalize_email_queue_item(
    claimed_queue_id,
    'failed',
    'phase7-test-worker',
    'simulated provider failure',
    120
  ) q;

  IF finalized_status IS DISTINCT FROM 'failed' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item failed path did not set failed status. Got: %', finalized_status;
  END IF;
  IF retry_last_error IS DISTINCT FROM 'simulated provider failure' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item failed path did not persist error text. Got: %', retry_last_error;
  END IF;
  IF retry_next_attempt_at IS NULL OR retry_next_attempt_at < now() + interval '100 seconds' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item failed path did not set retry delay correctly.';
  END IF;

  -- Optional Phase 7: queue ops admin RPCs should allow hr/admin/director and deny regular employees.
  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES (
    queue_ops_test_id, admin_id, 'system', 'phase7_queue_ops_admin', 'Queue ops admin', 'Queue ops admin view test row',
    'state_machine_queue_ops', queue_ops_test_id
  );

  INSERT INTO public.notification_delivery_queue (
    id, notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, attempts, next_attempt_at, last_error
  )
  VALUES (
    '90000000-0000-0000-0000-0000000000f2',
    queue_ops_test_id,
    admin_id,
    'email',
    'system',
    'phase7_queue_ops_admin',
    'zz_phase4b_admin@example.com',
    'Queue ops row',
    'Queue ops row body',
    '{}'::jsonb,
    'failed',
    4,
    now() - interval '1 minute',
    'phase7 test failure'
  )
  ON CONFLICT (notification_id, channel) DO UPDATE
    SET status = 'failed',
        attempts = 4,
        next_attempt_at = now() - interval '1 minute',
        leased_at = NULL,
        leased_by = NULL,
        sent_at = NULL,
        failed_at = now() - interval '2 minutes',
        last_error = 'phase7 test failure';

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);

  queue_summary := public.notification_admin_email_queue_summary();
  IF coalesce((queue_summary ->> 'failed_count')::int, 0) < 1 THEN
    RAISE EXCEPTION 'notification_admin_email_queue_summary did not report failed queue rows.';
  END IF;

  SELECT count(*)
  INTO queue_list_count
  FROM public.notification_admin_list_email_queue('failed', 20, 0) q
  WHERE q.notification_id = queue_ops_test_id;
  IF queue_list_count <> 1 THEN
    RAISE EXCEPTION 'notification_admin_list_email_queue did not return the expected failed queue row.';
  END IF;

  SELECT q.id, q.status, q.last_error
  INTO queue_ops_row_id, queue_ops_row_status, queue_ops_last_error
  FROM public.notification_admin_requeue_email_queue_item('90000000-0000-0000-0000-0000000000f2', 0) q;

  IF queue_ops_row_id IS DISTINCT FROM '90000000-0000-0000-0000-0000000000f2'::uuid
     OR queue_ops_row_status IS DISTINCT FROM 'pending'
     OR queue_ops_last_error IS NOT NULL
  THEN
    RAISE EXCEPTION 'notification_admin_requeue_email_queue_item did not reset the queue row correctly.';
  END IF;

  SELECT q.status, q.last_error
  INTO queue_ops_row_status, queue_ops_last_error
  FROM public.notification_admin_discard_email_queue_item('90000000-0000-0000-0000-0000000000f2', 'manual discard by test') q;

  IF queue_ops_row_status IS DISTINCT FROM 'discarded' OR queue_ops_last_error IS DISTINCT FROM 'manual discard by test' THEN
    RAISE EXCEPTION 'notification_admin_discard_email_queue_item did not discard the queue row correctly.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', emp_id::text, true);

  BEGIN
    PERFORM public.notification_admin_email_queue_summary();
    RAISE EXCEPTION 'notification_admin_email_queue_summary should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.notification_admin_list_email_queue('all', 5, 0);
    RAISE EXCEPTION 'notification_admin_list_email_queue should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.notification_admin_requeue_email_queue_item('90000000-0000-0000-0000-0000000000f2', 0);
    RAISE EXCEPTION 'notification_admin_requeue_email_queue_item should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;

  -- Strict server-side masking: admin receives masked sensitive fields, director receives full values.
  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
  SELECT p.employee_id, p.phone
  INTO masked_employee_identifier, masked_phone_value
  FROM public.get_employee_directory_profiles(emp_id) p
  LIMIT 1;

  IF masked_employee_identifier IS NOT NULL THEN
    RAISE EXCEPTION 'Admin should receive masked employee_id via get_employee_directory_profiles. Got: %', masked_employee_identifier;
  END IF;
  IF masked_phone_value IS NOT NULL THEN
    RAISE EXCEPTION 'Admin should receive masked phone via get_employee_directory_profiles. Got: %', masked_phone_value;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', director_id::text, true);
  SELECT p.employee_id, p.phone
  INTO director_visible_employee_identifier, director_visible_phone_value
  FROM public.get_employee_directory_profiles(emp_id) p
  LIMIT 1;

  IF director_visible_employee_identifier IS DISTINCT FROM 'ZZ-PHASE4B-EMP-001' THEN
    RAISE EXCEPTION 'Director should receive unmasked employee_id via get_employee_directory_profiles. Got: %', director_visible_employee_identifier;
  END IF;
  IF director_visible_phone_value IS DISTINCT FROM '+60123456789' THEN
    RAISE EXCEPTION 'Director should receive unmasked phone via get_employee_directory_profiles. Got: %', director_visible_phone_value;
  END IF;
END;
$$;

ROLLBACK;

BEGIN;

DO $$
DECLARE
  admin_id uuid := '91010000-0000-0000-0000-0000000000a1';
  emp_id uuid := '92020000-0000-0000-0000-0000000000a2';
  run_id uuid;
  run_row public.notification_email_worker_runs%ROWTYPE;
  run_summary jsonb;
  listed_count integer;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at
  )
  VALUES
    (admin_id, 'authenticated', 'authenticated', 'zz_phase9_admin@example.com', '{}'::jsonb, now(), now(), now()),
    (emp_id, 'authenticated', 'authenticated', 'zz_phase9_emp@example.com', '{}'::jsonb, now(), now(), now());

  UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
  UPDATE public.user_roles SET role = 'employee' WHERE user_id = emp_id;

  run_id := public.notification_worker_start_email_run(
    'phase9-test-worker',
    'stub',
    25,
    300,
    120,
    5,
    jsonb_build_object('source', 'state_machine_test')
  );

  IF run_id IS NULL THEN
    RAISE EXCEPTION 'notification_worker_start_email_run returned NULL.';
  END IF;

  SELECT *
  INTO run_row
  FROM public.notification_worker_finish_email_run(
    run_id,
    3, -- claimed
    3, -- processed
    2, -- sent
    1, -- failed
    0, -- discarded
    987,
    NULL
  );

  IF run_row.id IS DISTINCT FROM run_id OR run_row.run_status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'notification_worker_finish_email_run did not complete the run correctly.';
  END IF;
  IF run_row.sent_count <> 2 OR run_row.failed_count <> 1 OR run_row.duration_ms <> 987 THEN
    RAISE EXCEPTION 'notification_worker_finish_email_run did not persist run metrics.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);

  run_summary := public.notification_admin_email_worker_run_summary();
  IF coalesce((run_summary ->> 'completed_24h_count')::int, 0) < 1 THEN
    RAISE EXCEPTION 'notification_admin_email_worker_run_summary did not report completed runs.';
  END IF;
  IF coalesce((run_summary ->> 'sent_24h_count')::int, 0) < 2 THEN
    RAISE EXCEPTION 'notification_admin_email_worker_run_summary did not aggregate sent item counts.';
  END IF;

  SELECT count(*)
  INTO listed_count
  FROM public.notification_admin_list_email_worker_runs('completed', 20, 0) r
  WHERE r.id = run_id;

  IF listed_count <> 1 THEN
    RAISE EXCEPTION 'notification_admin_list_email_worker_runs did not return the inserted worker run.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', emp_id::text, true);

  BEGIN
    PERFORM public.notification_admin_email_worker_run_summary();
    RAISE EXCEPTION 'notification_admin_email_worker_run_summary should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;

  BEGIN
    PERFORM public.notification_admin_list_email_worker_runs('all', 5, 0);
    RAISE EXCEPTION 'notification_admin_list_email_worker_runs should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;

BEGIN;

DO $$
DECLARE
  admin_id uuid := '91090000-0000-0000-0000-0000000000a9';
  emp_id uuid := '92090000-0000-0000-0000-0000000000a9';
  notif_failed_id uuid := '93090000-0000-0000-0000-0000000000a9';
  notif_discarded_id uuid := '94090000-0000-0000-0000-0000000000a9';
  notif_ready_retry_id uuid := '95090000-0000-0000-0000-0000000000a9';
  q_failed_id uuid := '96090000-0000-0000-0000-0000000000a9';
  q_discarded_id uuid := '97090000-0000-0000-0000-0000000000a9';
  analytics jsonb;
  provider_resend_count integer;
  provider_stub_count integer;
  event_row_count integer;
  top_error_match_count integer;
  retry_ready_count integer;
  finalized_provider text;
BEGIN
  INSERT INTO auth.users (
    id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at
  )
  VALUES
    (admin_id, 'authenticated', 'authenticated', 'zz_phase9_deadletter_admin@example.com', '{}'::jsonb, now(), now(), now()),
    (emp_id, 'authenticated', 'authenticated', 'zz_phase9_deadletter_emp@example.com', '{}'::jsonb, now(), now(), now());

  UPDATE public.user_roles SET role = 'admin' WHERE user_id = admin_id;
  UPDATE public.user_roles SET role = 'employee' WHERE user_id = emp_id;

  INSERT INTO public.user_notifications (
    id, user_id, category, event_type, title, message, source_table, source_id
  )
  VALUES
    (notif_failed_id, admin_id, 'system', 'phase9_dead_letter_failed', 'DLQ Failed', 'Phase 9 dead-letter failed row', 'state_machine_dead_letter', notif_failed_id),
    (notif_discarded_id, admin_id, 'system', 'phase9_dead_letter_discarded', 'DLQ Discarded', 'Phase 9 dead-letter discarded row', 'state_machine_dead_letter', notif_discarded_id),
    (notif_ready_retry_id, admin_id, 'system', 'phase9_dead_letter_ready_retry', 'DLQ Retry Ready', 'Phase 9 dead-letter retry-ready row', 'state_machine_dead_letter', notif_ready_retry_id);

  INSERT INTO public.notification_delivery_queue (
    id, notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, attempts, next_attempt_at, leased_at, leased_by
  )
  VALUES
    (
      q_failed_id,
      notif_failed_id,
      admin_id,
      'email',
      'system',
      'phase9_dead_letter_failed',
      'zz_phase9_deadletter_admin@example.com',
      'Dead letter failed',
      'Dead letter failed body',
      '{}'::jsonb,
      'processing',
      2,
      now(),
      now(),
      'phase9-dead-letter-worker'
    ),
    (
      q_discarded_id,
      notif_discarded_id,
      admin_id,
      'email',
      'system',
      'phase9_dead_letter_discarded',
      'zz_phase9_deadletter_admin@example.com',
      'Dead letter discarded',
      'Dead letter discarded body',
      '{}'::jsonb,
      'processing',
      6,
      now(),
      now(),
      'phase9-dead-letter-worker'
    )
  ON CONFLICT (notification_id, channel) DO UPDATE
    SET status = EXCLUDED.status,
        attempts = EXCLUDED.attempts,
        leased_at = EXCLUDED.leased_at,
        leased_by = EXCLUDED.leased_by,
        next_attempt_at = EXCLUDED.next_attempt_at,
        failed_at = NULL,
        sent_at = NULL,
        last_error = NULL,
        last_provider = NULL;

  SELECT q.last_provider
  INTO finalized_provider
  FROM public.notification_worker_finalize_email_queue_item_v2(
    q_failed_id,
    'failed',
    'phase9-dead-letter-worker',
    'resend',
    '429 rate limit exceeded for resend account',
    120
  ) q;

  IF finalized_provider IS DISTINCT FROM 'resend' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item_v2 failed path did not stamp last_provider. Got: %', finalized_provider;
  END IF;

  SELECT q.last_provider
  INTO finalized_provider
  FROM public.notification_worker_finalize_email_queue_item_v2(
    q_discarded_id,
    'discarded',
    'phase9-dead-letter-worker',
    'stub',
    'permanent test discard',
    300
  ) q;

  IF finalized_provider IS DISTINCT FROM 'stub' THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item_v2 discarded path did not stamp last_provider. Got: %', finalized_provider;
  END IF;

  INSERT INTO public.notification_delivery_queue (
    notification_id, user_id, channel, category, event_type, recipient_email, subject, body_text,
    payload, status, attempts, next_attempt_at, failed_at, last_error, last_provider
  )
  VALUES (
    notif_ready_retry_id,
    admin_id,
    'email',
    'system',
    'phase9_dead_letter_failed',
    'zz_phase9_deadletter_admin@example.com',
    'Dead letter ready retry',
    'Dead letter ready retry body',
    '{}'::jsonb,
    'failed',
    3,
    now() - interval '2 minutes',
    now() - interval '3 minutes',
    '429 rate limit exceeded for resend account',
    'resend'
  )
  ON CONFLICT (notification_id, channel) DO UPDATE
    SET status = 'failed',
        attempts = 3,
        next_attempt_at = now() - interval '2 minutes',
        failed_at = now() - interval '3 minutes',
        last_error = '429 rate limit exceeded for resend account',
        last_provider = 'resend';

  PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);

  analytics := public.notification_admin_email_dead_letter_analytics(24, 10);

  SELECT coalesce(sum((e->>'count')::int), 0)
  INTO provider_resend_count
  FROM jsonb_array_elements(coalesce(analytics->'providers', '[]'::jsonb)) e
  WHERE e->>'provider' = 'resend';

  IF provider_resend_count < 2 THEN
    RAISE EXCEPTION 'Dead-letter analytics provider rollup missing resend counts. Got: %', provider_resend_count;
  END IF;

  SELECT coalesce(sum((e->>'count')::int), 0)
  INTO provider_stub_count
  FROM jsonb_array_elements(coalesce(analytics->'providers', '[]'::jsonb)) e
  WHERE e->>'provider' = 'stub';

  IF provider_stub_count < 1 THEN
    RAISE EXCEPTION 'Dead-letter analytics provider rollup missing stub counts.';
  END IF;

  SELECT count(*)
  INTO event_row_count
  FROM jsonb_array_elements(coalesce(analytics->'provider_event_types', '[]'::jsonb)) e
  WHERE e->>'provider' = 'resend'
    AND e->>'event_type' = 'phase9_dead_letter_failed';

  IF event_row_count < 1 THEN
    RAISE EXCEPTION 'Dead-letter analytics provider_event_types missing resend/phase9_dead_letter_failed row.';
  END IF;

  SELECT count(*)
  INTO top_error_match_count
  FROM jsonb_array_elements(coalesce(analytics->'top_errors', '[]'::jsonb)) e
  WHERE coalesce(e->>'error_fingerprint', '') ILIKE '%rate limit exceeded%';

  IF top_error_match_count < 1 THEN
    RAISE EXCEPTION 'Dead-letter analytics top_errors missing expected rate-limit fingerprint.';
  END IF;

  retry_ready_count := coalesce((analytics->>'retry_ready_failed_count')::int, 0);
  IF retry_ready_count < 1 THEN
    RAISE EXCEPTION 'Dead-letter analytics retry_ready_failed_count should be >= 1.';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', emp_id::text, true);

  BEGIN
    PERFORM public.notification_admin_email_dead_letter_analytics(24, 10);
    RAISE EXCEPTION 'notification_admin_email_dead_letter_analytics should deny employee role.';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM NOT ILIKE '%insufficient privileges%' THEN
        RAISE;
      END IF;
  END;
END;
$$;

ROLLBACK;

\echo 'State-machine SQL regression checks passed.'
