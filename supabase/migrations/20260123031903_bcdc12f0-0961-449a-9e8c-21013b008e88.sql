-- Add new status for document request workflow
-- Update leave_types to support policy configuration
ALTER TABLE public.leave_types 
ADD COLUMN IF NOT EXISTS min_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS requires_document boolean DEFAULT false;

-- Add columns to leave_requests for document support and amendments
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS document_url text,
ADD COLUMN IF NOT EXISTS document_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS manager_comments text,
ADD COLUMN IF NOT EXISTS amendment_notes text,
ADD COLUMN IF NOT EXISTS amended_at timestamp with time zone;

-- Update leave_types with sensible defaults
UPDATE public.leave_types SET min_days = 7 WHERE name ILIKE '%annual%';
UPDATE public.leave_types SET min_days = 1 WHERE min_days IS NULL;

-- Allow HR to update leave_types
CREATE POLICY "HR can update leave types" 
ON public.leave_types 
FOR UPDATE 
USING (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'hr'::app_role) OR has_role(auth.uid(), 'admin'::app_role));