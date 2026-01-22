-- Add policy for HR/Admin to view all user roles (needed for the Admin dashboard)
CREATE POLICY "HR and Admin can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'hr'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);