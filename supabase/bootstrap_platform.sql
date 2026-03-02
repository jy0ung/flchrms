-- HRMS Bootstrap Platform SQL
-- Non-public app-owned platform artifacts required for compatibility bootstrap.
--
-- Scope:
-- - storage.objects policies for app buckets
-- - pg_cron retention-job registration (when pg_cron is available)
--
-- Notes:
-- - Apply after public schema/functions exist (e.g. after migrations or schema snapshot).
-- - Idempotent and safe to re-apply.

BEGIN;

-- storage.objects policies for employee-documents / leave-documents
DROP POLICY IF EXISTS employee_documents_select_own ON storage.objects;
CREATE POLICY employee_documents_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS employee_documents_select_hr_director ON storage.objects;
CREATE POLICY employee_documents_select_hr_director
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  )
);

DROP POLICY IF EXISTS employee_documents_insert_hr_director ON storage.objects;
CREATE POLICY employee_documents_insert_hr_director
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  )
);

DROP POLICY IF EXISTS employee_documents_delete_hr_director ON storage.objects;
CREATE POLICY employee_documents_delete_hr_director
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  )
);

DROP POLICY IF EXISTS leave_documents_select_authorized ON storage.objects;
CREATE POLICY leave_documents_select_authorized
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
    OR public.is_manager_of(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.is_department_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

DROP POLICY IF EXISTS leave_documents_insert_owner ON storage.objects;
CREATE POLICY leave_documents_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS leave_documents_update_owner ON storage.objects;
CREATE POLICY leave_documents_update_owner
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS leave_documents_delete_owner ON storage.objects;
CREATE POLICY leave_documents_delete_owner
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

COMMIT;

-- Register notification retention cron job when pg_cron is available.
DO $$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
     AND EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'cron' AND p.proname = 'schedule'
     )
  THEN
    BEGIN
      SELECT j.jobid
      INTO v_job_id
      FROM cron.job j
      WHERE j.jobname = 'notification-retention-daily'
      LIMIT 1;

      IF v_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_job_id);
      END IF;

      PERFORM cron.schedule(
        'notification-retention-daily',
        '17 3 * * *',
        'SELECT public.run_notification_retention_job();'
      );
    EXCEPTION
      WHEN undefined_table OR undefined_function OR invalid_schema_name THEN
        NULL;
    END;
  END IF;
END;
$$;
