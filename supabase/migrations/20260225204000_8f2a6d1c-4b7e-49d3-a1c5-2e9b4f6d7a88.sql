-- Ensure anon cannot execute admin-masked employee directory RPC.

REVOKE ALL ON FUNCTION public.get_employee_directory_profiles(uuid) FROM anon;
