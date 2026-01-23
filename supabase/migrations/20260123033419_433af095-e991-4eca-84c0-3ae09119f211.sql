-- Create a function to check if manager is in same department as employee
CREATE OR REPLACE FUNCTION public.is_department_manager(_manager_id uuid, _employee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles manager
    JOIN public.profiles employee ON employee.id = _employee_id
    WHERE manager.id = _manager_id 
    AND manager.department_id IS NOT NULL
    AND manager.department_id = employee.department_id
  )
$$;

-- Drop existing manager policies for profiles
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;

-- Create new policy: Managers can view profiles in their department
CREATE POLICY "Managers can view department profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    id = auth.uid() -- Can see own profile
    OR manager_id = auth.uid() -- Can see direct reports
    OR is_department_manager(auth.uid(), id) -- Can see same department
  )
);

-- Drop existing manager policies for leave_requests
DROP POLICY IF EXISTS "Managers can view team leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Managers can approve team leave requests" ON public.leave_requests;

-- Create new policy: Managers can view leave requests from their department
CREATE POLICY "Managers can view department leave requests"
ON public.leave_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    employee_id = auth.uid() -- Can see own requests
    OR is_manager_of(auth.uid(), employee_id) -- Direct reports
    OR is_department_manager(auth.uid(), employee_id) -- Same department
  )
);

-- Create new policy: Managers can approve leave requests from their department
CREATE POLICY "Managers can approve department leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    is_manager_of(auth.uid(), employee_id)
    OR is_department_manager(auth.uid(), employee_id)
  )
);

-- Drop existing manager policies for attendance
DROP POLICY IF EXISTS "Managers can view team attendance" ON public.attendance;

-- Create new policy: Managers can view attendance from their department
CREATE POLICY "Managers can view department attendance"
ON public.attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND (
    employee_id = auth.uid() -- Can see own attendance
    OR is_manager_of(auth.uid(), employee_id) -- Direct reports
    OR is_department_manager(auth.uid(), employee_id) -- Same department
  )
);