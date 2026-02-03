-- Add new approval columns to leave_requests for multi-level approval
ALTER TABLE public.leave_requests 
ADD COLUMN IF NOT EXISTS gm_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS gm_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS director_approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS director_approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hr_notified_at timestamp with time zone;

-- Update RLS policies for leave_requests to include new roles
DROP POLICY IF EXISTS "GM can approve department leave requests" ON public.leave_requests;
CREATE POLICY "GM can approve department leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  (is_manager_of(auth.uid(), employee_id) OR is_department_manager(auth.uid(), employee_id))
);

DROP POLICY IF EXISTS "GM can view department leave requests" ON public.leave_requests;
CREATE POLICY "GM can view department leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  ((employee_id = auth.uid()) OR is_manager_of(auth.uid(), employee_id) OR is_department_manager(auth.uid(), employee_id))
);

DROP POLICY IF EXISTS "Director can approve leave requests" ON public.leave_requests;
CREATE POLICY "Director can approve leave requests"
ON public.leave_requests
FOR UPDATE
USING (has_role(auth.uid(), 'director'::app_role));

DROP POLICY IF EXISTS "Director can view all leave requests" ON public.leave_requests;
CREATE POLICY "Director can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (has_role(auth.uid(), 'director'::app_role));

-- Update profiles RLS for new roles
DROP POLICY IF EXISTS "GM can view department profiles" ON public.profiles;
CREATE POLICY "GM can view department profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'general_manager'::app_role) AND 
  ((id = auth.uid()) OR (manager_id = auth.uid()) OR is_department_manager(auth.uid(), id))
);

DROP POLICY IF EXISTS "Director can view all profiles" ON public.profiles;
CREATE POLICY "Director can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'director'::app_role));