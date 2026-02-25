-- RBAC remediation (phase 1)
-- Aligns Admin/HR/Director responsibilities after leave/payroll workflow changes.
-- Admin remains a system supervisor (read-only on most HR ops tables), while
-- Director gets unrestricted business-operational access.

-- Drop existing public policies for targeted tables so we can recreate them with
-- explicit, stable policy names and updated role semantics.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
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
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- Drop only storage policies related to employee-documents / leave-documents buckets.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        position('employee-documents' in (coalesce(qual, '') || ' ' || coalesce(with_check, ''))) > 0
        OR position('leave-documents' in (coalesce(qual, '') || ' ' || coalesce(with_check, ''))) > 0
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- public.announcements
-- Admin keeps privileged read for supervision, but write access is HR/Director only.
-- ---------------------------------------------------------------------------
CREATE POLICY announcements_select_authenticated
ON public.announcements
FOR SELECT
TO authenticated
USING (
  (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  )
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_insert_hr_director
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_update_hr_director
ON public.announcements
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY announcements_delete_hr_director
ON public.announcements
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.attendance
-- Admin is read-only for supervision. Director gets org-level operational access.
-- ---------------------------------------------------------------------------
CREATE POLICY attendance_select_authenticated
ON public.attendance
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND (
      employee_id = request_user_id()
      OR is_manager_of(request_user_id(), employee_id)
      OR is_department_manager(request_user_id(), employee_id)
    )
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND (
      employee_id = request_user_id()
      OR is_manager_of(request_user_id(), employee_id)
      OR is_department_manager(request_user_id(), employee_id)
    )
  )
);

CREATE POLICY attendance_insert_self_hr_director
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY attendance_update_self_hr_director
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY attendance_delete_hr_director
ON public.attendance
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.department_events
-- HR/Director manage globally. Managers/GM can manage their own department events.
-- Anonymous access removed.
-- ---------------------------------------------------------------------------
CREATE POLICY department_events_select_authenticated
ON public.department_events
FOR SELECT
TO authenticated
USING (
  department_id IN (
    SELECT profiles.department_id
    FROM public.profiles
    WHERE profiles.id = request_user_id()
  )
  OR department_id IS NULL
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_insert_privileged
ON public.department_events
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_update_privileged
ON public.department_events
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

CREATE POLICY department_events_delete_privileged
ON public.department_events
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    (
      has_role(request_user_id(), 'manager'::app_role)
      OR has_role(request_user_id(), 'general_manager'::app_role)
    )
    AND is_department_manager(request_user_id(), request_user_id())
  )
);

-- ---------------------------------------------------------------------------
-- public.departments
-- Admin is read-only here; HR/Director manage.
-- ---------------------------------------------------------------------------
CREATE POLICY departments_select_authenticated
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY departments_insert_hr_director
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY departments_update_hr_director
ON public.departments
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY departments_delete_hr_director
ON public.departments
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.documents
-- Admin is removed from employee-document access. Director gets unrestricted access.
-- ---------------------------------------------------------------------------
CREATE POLICY documents_select_authenticated
ON public.documents
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND is_department_manager(request_user_id(), employee_id)
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND is_department_manager(request_user_id(), employee_id)
  )
);

CREATE POLICY documents_insert_hr_director
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY documents_update_hr_director
ON public.documents
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY documents_delete_hr_director
ON public.documents
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.holidays
-- Anonymous access removed. HR/Director manage company holidays.
-- ---------------------------------------------------------------------------
CREATE POLICY holidays_select_authenticated
ON public.holidays
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY holidays_insert_hr_director
ON public.holidays
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY holidays_update_hr_director
ON public.holidays
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY holidays_delete_hr_director
ON public.holidays
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.leave_types
-- Admin becomes read-only; HR/Director manage leave policy definitions.
-- ---------------------------------------------------------------------------
CREATE POLICY leave_types_select_authenticated
ON public.leave_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY leave_types_insert_hr_director
ON public.leave_types
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY leave_types_update_hr_director
ON public.leave_types
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY leave_types_delete_hr_director
ON public.leave_types
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.performance_reviews
-- Admin read-only for supervision. HR/Director/reviewer manage review lifecycle.
-- ---------------------------------------------------------------------------
CREATE POLICY performance_reviews_select_authenticated
ON public.performance_reviews
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_insert_reviewer_hr_director
ON public.performance_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_update_reviewer_hr_director
ON public.performance_reviews
FOR UPDATE
TO authenticated
USING (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY performance_reviews_delete_reviewer_hr_director
ON public.performance_reviews
FOR DELETE
TO authenticated
USING (
  reviewer_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.profiles
-- Admin remains read-only + broad update access temporarily for account supervision
-- (e.g. username management), while Director is added for business-ops access.
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_authenticated
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
  OR (
    has_role(request_user_id(), 'manager'::app_role)
    AND (
      id = request_user_id()
      OR manager_id = request_user_id()
      OR is_department_manager(request_user_id(), id)
    )
  )
  OR (
    has_role(request_user_id(), 'general_manager'::app_role)
    AND (
      id = request_user_id()
      OR manager_id = request_user_id()
      OR is_department_manager(request_user_id(), id)
    )
  )
);

CREATE POLICY profiles_insert_hr_director
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY profiles_update_self_hr_admin_director
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY profiles_delete_hr_director
ON public.profiles
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.training_programs
-- Admin read-only (via SELECT true). HR/Director manage programs.
-- ---------------------------------------------------------------------------
CREATE POLICY training_programs_select_authenticated
ON public.training_programs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY training_programs_insert_hr_director
ON public.training_programs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_programs_update_hr_director
ON public.training_programs
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_programs_delete_hr_director
ON public.training_programs
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- public.training_enrollments
-- Employees can self-enroll. Admin is read-only for supervision. HR/Director manage.
-- ---------------------------------------------------------------------------
CREATE POLICY training_enrollments_select_authenticated
ON public.training_enrollments
FOR SELECT
TO authenticated
USING (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'admin'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_insert_self_hr_director
ON public.training_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  employee_id = request_user_id()
  OR has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_update_hr_director
ON public.training_enrollments
FOR UPDATE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
)
WITH CHECK (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

CREATE POLICY training_enrollments_delete_hr_director
ON public.training_enrollments
FOR DELETE
TO authenticated
USING (
  has_role(request_user_id(), 'hr'::app_role)
  OR has_role(request_user_id(), 'director'::app_role)
);

-- ---------------------------------------------------------------------------
-- storage.objects (employee-documents + leave-documents)
-- Admin removed from employee/leave document visibility. Director added where needed.
-- ---------------------------------------------------------------------------
CREATE POLICY employee_documents_select_own
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY employee_documents_select_hr_director
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY employee_documents_insert_hr_director
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY employee_documents_delete_hr_director
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (
    public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
  )
);

CREATE POLICY leave_documents_insert_owner
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY leave_documents_select_authorized
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'director'::app_role)
    OR public.is_manager_of(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.is_department_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY leave_documents_update_owner
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY leave_documents_delete_owner
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
