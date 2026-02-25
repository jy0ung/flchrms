REVOKE ALL ON FUNCTION public.mark_user_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_read(uuid[]) TO authenticated, service_role;
