CREATE OR REPLACE FUNCTION public.delete_user_notifications(
  _older_than_days integer DEFAULT 90,
  _read_only boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := public.request_user_id();
  v_days integer := coalesce(_older_than_days, 90);
  v_count integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF v_days < 1 OR v_days > 3650 THEN
    RAISE EXCEPTION 'Retention window must be between 1 and 3650 days.';
  END IF;

  DELETE FROM public.user_notifications n
  WHERE n.user_id = v_user_id
    AND n.created_at < now() - make_interval(days => v_days)
    AND (NOT _read_only OR n.read_at IS NOT NULL);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_notifications(integer, boolean) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user_notifications(integer, boolean) TO authenticated, service_role;
