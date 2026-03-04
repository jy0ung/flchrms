-- Dashboard layout preferences (per-user, server-side persistence)
-- Stores the full DashboardLayoutStateV2 object as JSONB so users'
-- widget order, visibility, and sizing survive across browsers/devices.
BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_preferences (
  user_id       uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  layout_state  jsonb NOT NULL,
  preset_version integer NOT NULL DEFAULT 6,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.dashboard_preferences IS 'Per-user dashboard widget layout preferences.';
COMMENT ON COLUMN public.dashboard_preferences.layout_state IS 'Full DashboardLayoutStateV2 JSON — widget order, positions, widths, visibility.';
COMMENT ON COLUMN public.dashboard_preferences.preset_version IS 'Tracks the default-preset version this layout was derived from; enables auto-migration when system defaults change.';

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_dashboard_preferences_updated_at ON public.dashboard_preferences;
CREATE TRIGGER update_dashboard_preferences_updated_at
  BEFORE UPDATE ON public.dashboard_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dashboard_preferences_select_own ON public.dashboard_preferences;
CREATE POLICY dashboard_preferences_select_own ON public.dashboard_preferences
  FOR SELECT TO authenticated
  USING (user_id = public.request_user_id());

DROP POLICY IF EXISTS dashboard_preferences_insert_own ON public.dashboard_preferences;
CREATE POLICY dashboard_preferences_insert_own ON public.dashboard_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.request_user_id());

DROP POLICY IF EXISTS dashboard_preferences_update_own ON public.dashboard_preferences;
CREATE POLICY dashboard_preferences_update_own ON public.dashboard_preferences
  FOR UPDATE TO authenticated
  USING  (user_id = public.request_user_id())
  WITH CHECK (user_id = public.request_user_id());

DROP POLICY IF EXISTS dashboard_preferences_delete_own ON public.dashboard_preferences;
CREATE POLICY dashboard_preferences_delete_own ON public.dashboard_preferences
  FOR DELETE TO authenticated
  USING (user_id = public.request_user_id());

-- Grants
REVOKE ALL ON public.dashboard_preferences FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_preferences TO authenticated;

COMMIT;
