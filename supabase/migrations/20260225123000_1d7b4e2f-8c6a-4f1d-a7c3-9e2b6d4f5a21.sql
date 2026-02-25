CREATE OR REPLACE FUNCTION public.mark_user_notifications_unread(_notification_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF _notification_ids IS NULL OR coalesce(array_length(_notification_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Notification IDs are required.';
  END IF;

  UPDATE public.user_notifications n
  SET read_at = NULL
  WHERE n.user_id = v_user_id
    AND n.id = ANY (_notification_ids)
    AND n.read_at IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_user_notifications_unread(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_user_notifications_unread(uuid[]) TO authenticated, service_role;
