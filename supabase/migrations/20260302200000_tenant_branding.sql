-- Tenant branding configuration table
-- Stores company logo, name, and theme colors for white-label customization.
-- Singleton row pattern — only one row exists at a time.

BEGIN;

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'FL Group',
  company_tagline text DEFAULT 'HR Management System',
  logo_url text,                     -- Supabase Storage path or external URL
  favicon_url text,
  login_background_url text,         -- Optional background for auth page
  primary_color text DEFAULT '221 83% 53%',     -- HSL string (no parens)
  accent_color text DEFAULT '142 71% 45%',
  sidebar_color text DEFAULT '0 0% 3%',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Singleton constraint: only one row allowed
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_branding_singleton
  ON public.tenant_branding ((true));

-- ── Timestamps ───────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER update_tenant_branding_updated_at
  BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read branding (needed for sidebar, auth page, etc.)
DROP POLICY IF EXISTS tenant_branding_select_authenticated ON public.tenant_branding;
CREATE POLICY tenant_branding_select_authenticated
  ON public.tenant_branding FOR SELECT TO authenticated
  USING (true);

-- Only admin and hr can update branding
DROP POLICY IF EXISTS tenant_branding_update_admin_hr ON public.tenant_branding;
CREATE POLICY tenant_branding_update_admin_hr
  ON public.tenant_branding FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

-- Only admin and hr can insert (initial seed)
DROP POLICY IF EXISTS tenant_branding_insert_admin_hr ON public.tenant_branding;
CREATE POLICY tenant_branding_insert_admin_hr
  ON public.tenant_branding FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'hr'::public.app_role)
  );

-- ── Seed default row ─────────────────────────────────────────────────────────
INSERT INTO public.tenant_branding (company_name, company_tagline, primary_color, accent_color, sidebar_color)
VALUES ('FL Group', 'HR Management System', '221 83% 53%', '142 71% 45%', '0 0% 3%')
ON CONFLICT ((true)) DO NOTHING;

-- ── Storage bucket for branding assets ───────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding-assets', 'branding-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for branding assets (logos/favicons are public)
DROP POLICY IF EXISTS branding_assets_select_public ON storage.objects;
CREATE POLICY branding_assets_select_public
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'branding-assets');

-- Only admin/hr can upload branding assets
DROP POLICY IF EXISTS branding_assets_insert_admin_hr ON storage.objects;
CREATE POLICY branding_assets_insert_admin_hr
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'branding-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'hr'::public.app_role)
    )
  );

-- Only admin/hr can delete branding assets
DROP POLICY IF EXISTS branding_assets_delete_admin_hr ON storage.objects;
CREATE POLICY branding_assets_delete_admin_hr
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'hr'::public.app_role)
    )
  );

-- Only admin/hr can update branding assets
DROP POLICY IF EXISTS branding_assets_update_admin_hr ON storage.objects;
CREATE POLICY branding_assets_update_admin_hr
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'branding-assets'
    AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'hr'::public.app_role)
    )
  );

COMMIT;
