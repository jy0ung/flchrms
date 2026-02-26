\echo 'Running RBAC SQL regression checks...'

DO $$
DECLARE
  expr text;
BEGIN
  -- All remediated public table policies must target authenticated only (no PUBLIC role).
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (
        ARRAY[
          'announcements',
          'attendance',
          'department_events',
          'departments',
          'documents',
          'holidays',
          'leave_types',
          'performance_reviews',
          'profiles',
          'training_enrollments',
          'training_programs'
        ]
      )
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'Expected remediated public policies to target only authenticated role.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (
        ARRAY[
          'announcements',
          'attendance',
          'department_events',
          'departments',
          'documents',
          'holidays',
          'leave_types',
          'performance_reviews',
          'profiles',
          'training_enrollments',
          'training_programs'
        ]
      )
      AND roles @> ARRAY['public']::name[]
  ) THEN
    RAISE EXCEPTION 'Unexpected PUBLIC-targeted policy found on remediated public tables.';
  END IF;

  -- Attendance: admin is read-only (SELECT may mention admin, writes must not).
  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'attendance_update_self_hr_director';
  IF expr IS NULL OR expr LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'attendance_update_self_hr_director must include director and exclude admin.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'attendance_select_authenticated';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'attendance_select_authenticated must include admin and director read access.';
  END IF;

  -- Documents table: admin removed, director added.
  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'documents_select_authenticated';
  IF expr IS NULL OR expr LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'documents_select_authenticated must exclude admin and include director.';
  END IF;

  -- System admin policy shift: non-sensitive app configuration tables should include admin writes.
  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'departments' AND policyname = 'departments_update_hr_director';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' OR expr NOT LIKE '%hr%' THEN
    RAISE EXCEPTION 'departments_update_hr_director must include hr/admin/director.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'leave_types' AND policyname = 'leave_types_update_hr_director';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' OR expr NOT LIKE '%hr%' THEN
    RAISE EXCEPTION 'leave_types_update_hr_director must include hr/admin/director.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'holidays' AND policyname = 'holidays_update_hr_director';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' OR expr NOT LIKE '%hr%' THEN
    RAISE EXCEPTION 'holidays_update_hr_director must include hr/admin/director.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'department_events' AND policyname = 'department_events_update_privileged';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' OR expr NOT LIKE '%hr%' THEN
    RAISE EXCEPTION 'department_events_update_privileged must include hr/admin/director.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'department_events' AND policyname = 'department_events_select_authenticated';
  IF expr IS NULL OR expr NOT LIKE '%admin%' THEN
    RAISE EXCEPTION 'department_events_select_authenticated must include admin visibility.';
  END IF;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'announcements' AND policyname = 'announcements_update_hr_director';
  IF expr IS NULL OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' OR expr NOT LIKE '%hr%' THEN
    RAISE EXCEPTION 'announcements_update_hr_director must include hr/admin/director.';
  END IF;

  -- Leave approvals: hr/admin cannot approve; director remains final approver role.
  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'leave_requests' AND policyname = 'leave_requests_update_workflow_and_self';
  IF expr IS NULL OR expr LIKE '%admin%' OR expr LIKE '%hr%' OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'leave_requests_update_workflow_and_self must exclude hr/admin and include director.';
  END IF;

  -- Leave requests SELECT should still include HR/Admin/Director visibility (view-only model).
  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'leave_requests' AND policyname = 'leave_requests_select_authenticated';
  IF expr IS NULL OR expr NOT LIKE '%hr%' OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'leave_requests_select_authenticated must include hr/admin/director visibility.';
  END IF;

  -- Leave cancellation workflows: authenticated-only policies, privileged writes include hr/admin/director.
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_cancellation_workflows'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'leave_cancellation_workflows policies must target authenticated only.';
  END IF;

  FOR expr IN
    SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_cancellation_workflows'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
  LOOP
    IF expr NOT LIKE '%hr%' OR expr NOT LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
      RAISE EXCEPTION 'leave_cancellation_workflows privileged write policies must include hr/admin/director.';
    END IF;
  END LOOP;

  -- request_leave_cancellation(uuid,text) RPC must be hardened and auth-only executable.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'request_leave_cancellation'
      AND oidvectortypes(p.proargtypes) = 'uuid, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'request_leave_cancellation(uuid,text) missing or not hardened.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'request_leave_cancellation'
      AND oidvectortypes(p.proargtypes) = 'uuid'
  ) THEN
    RAISE EXCEPTION 'Legacy request_leave_cancellation(uuid) overload should not exist.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.request_leave_cancellation(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.request_leave_cancellation(uuid,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'request_leave_cancellation(uuid,text) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- amend_leave_request(uuid,text,text,text) RPC must be hardened and auth-only executable.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'amend_leave_request'
      AND oidvectortypes(p.proargtypes) = 'uuid, text, text, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'amend_leave_request(uuid,text,text,text) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.amend_leave_request(uuid,text,text,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.amend_leave_request(uuid,text,text,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'amend_leave_request(uuid,text,text,text) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Calendar-safe leave feed RPC must be hardened and auth-only.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_calendar_visible_leaves'
      AND oidvectortypes(p.proargtypes) = 'date, date'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'get_calendar_visible_leaves(date,date) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_calendar_visible_leaves(date,date)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_calendar_visible_leaves(date,date)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'get_calendar_visible_leaves(date,date) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Training and performance writes: admin removed, director included.
  FOR expr IN
    SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        (tablename = 'training_programs' AND cmd IN ('INSERT', 'UPDATE', 'DELETE'))
        OR (tablename = 'training_enrollments' AND cmd IN ('UPDATE', 'DELETE'))
        OR (tablename = 'performance_reviews' AND cmd IN ('INSERT', 'UPDATE', 'DELETE'))
      )
  LOOP
    IF expr LIKE '%admin%' OR expr NOT LIKE '%director%' THEN
      RAISE EXCEPTION 'A remediated training/performance write policy still mentions admin or omits director.';
    END IF;
  END LOOP;

  -- Storage policies for employee-documents / leave-documents should be authenticated only.
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'employee_documents_delete_hr_director',
        'employee_documents_insert_hr_director',
        'employee_documents_select_hr_director',
        'employee_documents_select_own',
        'leave_documents_delete_owner',
        'leave_documents_insert_owner',
        'leave_documents_select_authorized',
        'leave_documents_update_owner'
      )
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'Expected rebuilt storage RBAC policies to target authenticated role only.';
  END IF;

  -- Admin should no longer have employee/leave document storage access; director should.
  FOR expr IN
    SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'employee_documents_delete_hr_director',
        'employee_documents_insert_hr_director',
        'employee_documents_select_hr_director',
        'leave_documents_select_authorized'
      )
  LOOP
    IF expr LIKE '%admin%' THEN
      RAISE EXCEPTION 'A storage document policy still mentions admin.';
    END IF;
  END LOOP;

  SELECT lower(coalesce(qual, '') || ' ' || coalesce(with_check, ''))
  INTO expr
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'leave_documents_select_authorized';
  IF expr IS NULL OR expr NOT LIKE '%director%' THEN
    RAISE EXCEPTION 'leave_documents_select_authorized must include director access.';
  END IF;

  -- Phase 2: admin limited profile updates are enforced by trigger + hardened function.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND NOT t.tgisinternal
      AND t.tgname = 'zz_guard_profiles_admin_update_scope'
  ) THEN
    RAISE EXCEPTION 'Missing zz_guard_profiles_admin_update_scope trigger on public.profiles.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'enforce_profiles_admin_update_scope'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'Profile admin update scope function missing or not hardened (SECURITY DEFINER/search_path).';
  END IF;

  -- Leave request event log should be readable only by authenticated users via RLS.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'leave_request_events'
  ) THEN
    RAISE EXCEPTION 'leave_request_events table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_request_events'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'leave_request_events policies must target authenticated only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leave_request_events'
      AND policyname = 'leave_request_events_select_authenticated'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'leave_request_events_select_authenticated policy is missing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.leave_request_events', 'SELECT')
     OR has_table_privilege('anon', 'public.leave_request_events', 'SELECT')
  THEN
    RAISE EXCEPTION 'leave_request_events table grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- In-app notifications table should be authenticated-only and user-scoped via RLS.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_notifications'
  ) THEN
    RAISE EXCEPTION 'user_notifications table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'user_notifications policies must target authenticated only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'user_notifications_select_own'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'user_notifications_select_own policy is missing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.user_notifications', 'SELECT')
     OR has_table_privilege('anon', 'public.user_notifications', 'SELECT')
  THEN
    RAISE EXCEPTION 'user_notifications table grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Notification preferences table should be authenticated-only and self-managed via RLS.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_notification_preferences'
  ) THEN
    RAISE EXCEPTION 'user_notification_preferences table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notification_preferences'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'user_notification_preferences policies must target authenticated only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notification_preferences'
      AND policyname = 'user_notification_preferences_select_own'
      AND cmd = 'SELECT'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notification_preferences'
      AND policyname = 'user_notification_preferences_insert_own'
      AND cmd = 'INSERT'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notification_preferences'
      AND policyname = 'user_notification_preferences_update_own'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'user_notification_preferences self policies are missing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.user_notification_preferences', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.user_notification_preferences', 'INSERT')
     OR NOT has_table_privilege('authenticated', 'public.user_notification_preferences', 'UPDATE')
     OR has_table_privilege('anon', 'public.user_notification_preferences', 'SELECT')
  THEN
    RAISE EXCEPTION 'user_notification_preferences table grants are incorrect (authenticated select/insert/update yes, anon no).';
  END IF;

  -- Notification preference helper and suppression trigger should be hardened.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_category_enabled'
      AND oidvectortypes(p.proargtypes) = 'uuid, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_category_enabled(uuid,text) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_category_enabled(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_category_enabled(uuid,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_category_enabled(uuid,text) grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_notifications'
      AND NOT t.tgisinternal
      AND t.tgname = 'z_before_insert_user_notifications_preferences'
  ) THEN
    RAISE EXCEPTION 'Missing z_before_insert_user_notifications_preferences trigger on public.user_notifications.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'suppress_muted_user_notifications'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'suppress_muted_user_notifications missing or not hardened.';
  END IF;

  -- Notification mark-read RPC must be hardened and auth-only executable.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mark_user_notifications_read'
      AND oidvectortypes(p.proargtypes) = 'uuid[]'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'mark_user_notifications_read(uuid[]) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.mark_user_notifications_read(uuid[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.mark_user_notifications_read(uuid[])', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'mark_user_notifications_read(uuid[]) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Notification mark-unread RPC must be hardened and auth-only executable.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'mark_user_notifications_unread'
      AND oidvectortypes(p.proargtypes) = 'uuid[]'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'mark_user_notifications_unread(uuid[]) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.mark_user_notifications_unread(uuid[])', 'EXECUTE')
     OR has_function_privilege('anon', 'public.mark_user_notifications_unread(uuid[])', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'mark_user_notifications_unread(uuid[]) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Notification cleanup RPC must be hardened and auth-only executable.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_user_notifications'
      AND oidvectortypes(p.proargtypes) = 'integer, boolean'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'delete_user_notifications(integer,boolean) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.delete_user_notifications(integer,boolean)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.delete_user_notifications(integer,boolean)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'delete_user_notifications(integer,boolean) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Email delivery queue groundwork: queue table should not be accessible to authenticated/anon.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notification_delivery_queue'
  ) THEN
    RAISE EXCEPTION 'notification_delivery_queue table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_delivery_queue'
      AND roles @> ARRAY['authenticated']::name[]
  ) OR EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_delivery_queue'
      AND roles @> ARRAY['anon']::name[]
  ) THEN
    RAISE EXCEPTION 'notification_delivery_queue should not expose policies to authenticated/anon.';
  END IF;

  IF has_table_privilege('authenticated', 'public.notification_delivery_queue', 'SELECT')
     OR has_table_privilege('anon', 'public.notification_delivery_queue', 'SELECT')
  THEN
    RAISE EXCEPTION 'notification_delivery_queue table grants are incorrect (authenticated/anon must have no access).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_notifications'
      AND NOT t.tgisinternal
      AND t.tgname = 'zz_after_insert_user_notifications_enqueue_email'
  ) THEN
    RAISE EXCEPTION 'Missing zz_after_insert_user_notifications_enqueue_email trigger on public.user_notifications.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_email_category_enabled'
      AND oidvectortypes(p.proargtypes) = 'uuid, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_email_category_enabled(uuid,text) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.notification_email_category_enabled(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_email_category_enabled(uuid,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_email_category_enabled(uuid,text) should not be executable by authenticated/anon.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_worker_claim_email_queue'
      AND oidvectortypes(p.proargtypes) = 'integer, text, integer, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_worker_claim_email_queue(integer,text,integer,integer) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.notification_worker_claim_email_queue(integer,text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_worker_claim_email_queue(integer,text,integer,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_worker_claim_email_queue(integer,text,integer,integer) must not be executable by authenticated/anon.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_worker_finalize_email_queue_item'
      AND oidvectortypes(p.proargtypes) = 'uuid, text, text, text, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item(uuid,text,text,text,integer) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.notification_worker_finalize_email_queue_item(uuid,text,text,text,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_worker_finalize_email_queue_item(uuid,text,text,text,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_worker_finalize_email_queue_item(uuid,text,text,text,integer) must not be executable by authenticated/anon.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'enqueue_notification_email_delivery'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'enqueue_notification_email_delivery() missing or not hardened.';
  END IF;

  -- Retention job RPC groundwork should be hardened and service-role only.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'run_notification_retention_job'
      AND oidvectortypes(p.proargtypes) = 'integer, integer, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'run_notification_retention_job(integer,integer,integer) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.run_notification_retention_job(integer,integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.run_notification_retention_job(integer,integer,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'run_notification_retention_job(integer,integer,integer) must not be executable by authenticated/anon.';
  END IF;

  -- Leave event -> notification bridge trigger/function should exist and be hardened.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_request_events'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzzz_create_leave_event_notifications'
  ) THEN
    RAISE EXCEPTION 'Missing zzzz_create_leave_event_notifications trigger on public.leave_request_events.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_leave_event_notifications'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'create_leave_event_notifications missing or not hardened.';
  END IF;

  -- Workflow config audit events table should be authenticated-only and privileged via RLS.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workflow_config_events'
  ) THEN
    RAISE EXCEPTION 'workflow_config_events table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_config_events'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'workflow_config_events policies must target authenticated only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'workflow_config_events'
      AND policyname = 'workflow_config_events_select_privileged'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'workflow_config_events_select_privileged policy is missing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.workflow_config_events', 'SELECT')
     OR has_table_privilege('anon', 'public.workflow_config_events', 'SELECT')
  THEN
    RAISE EXCEPTION 'workflow_config_events table grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_approval_workflows'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzzz_log_leave_approval_workflow_events'
  ) THEN
    RAISE EXCEPTION 'Missing zzzz_log_leave_approval_workflow_events trigger.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'leave_cancellation_workflows'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzzz_log_leave_cancellation_workflow_events'
  ) THEN
    RAISE EXCEPTION 'Missing zzzz_log_leave_cancellation_workflow_events trigger.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'workflow_config_events'
      AND NOT t.tgisinternal
      AND t.tgname = 'zzzz_create_workflow_config_event_notifications'
  ) THEN
    RAISE EXCEPTION 'Missing zzzz_create_workflow_config_event_notifications trigger.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'log_workflow_config_events'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'log_workflow_config_events missing or not hardened.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_workflow_config_event_notifications'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'create_workflow_config_event_notifications missing or not hardened.';
  END IF;

  -- Queue ops admin RPCs: authenticated-executable (role-checked internally), anon denied, hardened.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_email_queue_summary'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_email_queue_summary missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_email_queue_summary()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_email_queue_summary()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_email_queue_summary() grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_list_email_queue'
      AND oidvectortypes(p.proargtypes) = 'text, integer, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_list_email_queue(text,integer,integer) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_list_email_queue(text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_list_email_queue(text,integer,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_list_email_queue(text,integer,integer) grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_email_dead_letter_analytics'
      AND oidvectortypes(p.proargtypes) = 'integer, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_email_dead_letter_analytics(integer,integer) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_email_dead_letter_analytics(integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_email_dead_letter_analytics(integer,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_email_dead_letter_analytics(integer,integer) grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_requeue_email_queue_item'
      AND oidvectortypes(p.proargtypes) = 'uuid, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_requeue_email_queue_item(uuid,integer) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_requeue_email_queue_item(uuid,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_requeue_email_queue_item(uuid,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_requeue_email_queue_item(uuid,integer) grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_discard_email_queue_item'
      AND oidvectortypes(p.proargtypes) = 'uuid, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_discard_email_queue_item(uuid,text) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_discard_email_queue_item(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_discard_email_queue_item(uuid,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_discard_email_queue_item(uuid,text) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Phase 9: worker telemetry table/RPCs + notification history indexes.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notification_email_worker_runs'
  ) THEN
    RAISE EXCEPTION 'notification_email_worker_runs table is missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_email_worker_runs'
      AND roles <> ARRAY['authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'notification_email_worker_runs policies must target authenticated only.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notification_email_worker_runs'
      AND policyname = 'notification_email_worker_runs_select_privileged'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'notification_email_worker_runs_select_privileged policy is missing.';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.notification_email_worker_runs', 'SELECT')
     OR has_table_privilege('anon', 'public.notification_email_worker_runs', 'SELECT')
  THEN
    RAISE EXCEPTION 'notification_email_worker_runs table grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND indexname = 'idx_user_notifications_user_created'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND indexname = 'idx_user_notifications_user_category_created'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND indexname = 'idx_user_notifications_user_unread_created'
  ) THEN
    RAISE EXCEPTION 'Phase 9 user_notifications performance indexes are missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notification_delivery_queue'
      AND column_name = 'last_provider'
  ) THEN
    RAISE EXCEPTION 'notification_delivery_queue.last_provider column is missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notification_delivery_queue'
      AND indexname = 'idx_notification_delivery_queue_dead_letter_analytics'
  ) THEN
    RAISE EXCEPTION 'Dead-letter analytics queue index is missing.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_worker_start_email_run'
      AND oidvectortypes(p.proargtypes) = 'text, text, integer, integer, integer, integer, jsonb'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_worker_start_email_run(...) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.notification_worker_start_email_run(text,text,integer,integer,integer,integer,jsonb)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_worker_start_email_run(text,text,integer,integer,integer,integer,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.notification_worker_start_email_run(text,text,integer,integer,integer,integer,jsonb)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_worker_start_email_run grants are incorrect (service_role only).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_worker_finish_email_run'
      AND oidvectortypes(p.proargtypes) = 'uuid, integer, integer, integer, integer, integer, integer, text'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_worker_finish_email_run(...) missing or not hardened.';
  END IF;

  IF has_function_privilege('authenticated', 'public.notification_worker_finish_email_run(uuid,integer,integer,integer,integer,integer,integer,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_worker_finish_email_run(uuid,integer,integer,integer,integer,integer,integer,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.notification_worker_finish_email_run(uuid,integer,integer,integer,integer,integer,integer,text)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_worker_finish_email_run grants are incorrect (service_role only).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_email_worker_run_summary'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_email_worker_run_summary missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_email_worker_run_summary()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_email_worker_run_summary()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_email_worker_run_summary() grants are incorrect (authenticated yes, anon no).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'notification_admin_list_email_worker_runs'
      AND oidvectortypes(p.proargtypes) = 'text, integer, integer'
      AND p.prosecdef = true
      AND EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'notification_admin_list_email_worker_runs(text,integer,integer) missing or not hardened.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.notification_admin_list_email_worker_runs(text,integer,integer)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.notification_admin_list_email_worker_runs(text,integer,integer)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'notification_admin_list_email_worker_runs(text,integer,integer) grants are incorrect (authenticated yes, anon no).';
  END IF;

  -- Strict server-side masked employee directory RPC (authenticated only, anon denied).
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_employee_directory_profiles'
      AND oidvectortypes(p.proargtypes) = 'uuid'
      AND EXISTS (
        SELECT 1
        FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
        WHERE cfg = 'search_path=pg_catalog, public'
      )
  ) THEN
    RAISE EXCEPTION 'get_employee_directory_profiles(uuid) missing or not configured with fixed search_path.';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.get_employee_directory_profiles(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_employee_directory_profiles(uuid)', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'get_employee_directory_profiles(uuid) grants are incorrect (authenticated yes, anon no).';
  END IF;

END;
$$;

\echo 'RBAC SQL regression checks passed.'
