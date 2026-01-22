-- Fix profiles table SELECT policy to restrict access to sensitive employee data
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create more restrictive policies for profile access

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Managers can view their direct reports' profiles
CREATE POLICY "Managers can view team profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND manager_id = auth.uid()
);

-- HR and Admin can view all profiles
CREATE POLICY "HR and Admin can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'hr'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);