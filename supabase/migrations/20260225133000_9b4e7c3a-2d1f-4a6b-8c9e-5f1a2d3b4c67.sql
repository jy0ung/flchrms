CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_enabled boolean NOT NULL DEFAULT true,
  admin_enabled boolean NOT NULL DEFAULT true,
  system_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON public.user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_notification_preferences_select_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_select_own
ON public.user_notification_preferences
FOR SELECT
TO authenticated
USING (user_id = public.request_user_id());

DROP POLICY IF EXISTS user_notification_preferences_insert_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_insert_own
ON public.user_notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.request_user_id());

DROP POLICY IF EXISTS user_notification_preferences_update_own ON public.user_notification_preferences;
CREATE POLICY user_notification_preferences_update_own
ON public.user_notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = public.request_user_id())
WITH CHECK (user_id = public.request_user_id());

REVOKE ALL ON public.user_notification_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.notification_category_enabled(_user_id uuid, _category text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE lower(coalesce(_category, 'system'))
    WHEN 'leave' THEN coalesce(p.leave_enabled, true)
    WHEN 'admin' THEN coalesce(p.admin_enabled, true)
    WHEN 'system' THEN coalesce(p.system_enabled, true)
    ELSE true
  END
  FROM (SELECT 1) seed
  LEFT JOIN public.user_notification_preferences p
    ON p.user_id = _user_id;
$$;

REVOKE ALL ON FUNCTION public.notification_category_enabled(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notification_category_enabled(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.suppress_muted_user_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.notification_category_enabled(NEW.user_id, NEW.category) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.suppress_muted_user_notifications() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.suppress_muted_user_notifications() TO service_role;

DROP TRIGGER IF EXISTS z_before_insert_user_notifications_preferences ON public.user_notifications;
CREATE TRIGGER z_before_insert_user_notifications_preferences
BEFORE INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.suppress_muted_user_notifications();

ANALYZE public.user_notification_preferences;
