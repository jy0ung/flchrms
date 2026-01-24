-- Add RLS policies for leave-documents storage bucket
-- Files are organized as: {user_id}/{timestamp}.{ext}

-- Policy: Employees can upload their own documents
CREATE POLICY "Employees can upload own leave documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'leave-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Employees can view their own documents, HR/Admin can view all, Managers can view their reports
CREATE POLICY "Users can view authorized leave documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND (
    -- Owner can view their own documents
    auth.uid()::text = (storage.foldername(name))[1]
    -- HR and Admin can view all documents
    OR public.has_role(auth.uid(), 'hr'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    -- Managers can view documents of their direct reports or department members
    OR public.is_manager_of(auth.uid(), (storage.foldername(name))[1]::uuid)
    OR public.is_department_manager(auth.uid(), (storage.foldername(name))[1]::uuid)
  )
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own leave documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own leave documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'leave-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);