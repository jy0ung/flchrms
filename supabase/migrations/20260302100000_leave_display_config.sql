-- Migration: Leave Dashboard Display Configuration
-- Presentation-layer config for leave type visibility and ordering on the employee dashboard.
-- Additive-only — does NOT modify leave_types, leave_requests, or any workflow tables.

-- ═══════════════════════════════════════════════════════════════════
-- 1. TABLE
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.leave_type_display_config (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  category      TEXT NOT NULL DEFAULT 'primary'
                CHECK (category IN ('primary', 'secondary')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_leave_type_display_config UNIQUE (leave_type_id)
);

COMMENT ON TABLE public.leave_type_display_config IS
  'Presentation-layer config controlling which leave types appear on the employee dashboard and in what order.';

-- updated_at trigger (reuses existing standard function)
CREATE TRIGGER update_leave_type_display_config_updated_at
  BEFORE UPDATE ON public.leave_type_display_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- 2. RLS
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.leave_type_display_config ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read display config
CREATE POLICY leave_type_display_config_select_authenticated
  ON public.leave_type_display_config FOR SELECT
  TO authenticated
  USING (true);

-- Only Admin and HR can insert
CREATE POLICY leave_type_display_config_insert_admin_hr
  ON public.leave_type_display_config FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hr')
  );

-- Only Admin and HR can update
CREATE POLICY leave_type_display_config_update_admin_hr
  ON public.leave_type_display_config FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hr')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hr')
  );

-- Only Admin and HR can delete
CREATE POLICY leave_type_display_config_delete_admin_hr
  ON public.leave_type_display_config FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hr')
  );

-- ═══════════════════════════════════════════════════════════════════
-- 3. INDEX
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX idx_leave_type_display_config_order
  ON public.leave_type_display_config (display_order, category);

-- ═══════════════════════════════════════════════════════════════════
-- 4. RPC — Fetch ordered visible leave types for dashboard
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_dashboard_leave_types()
RETURNS TABLE (
  leave_type_id   UUID,
  leave_type_name TEXT,
  days_allowed    INTEGER,
  display_order   INTEGER,
  category        TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If display config exists, use it (only visible types, ordered)
  IF EXISTS (SELECT 1 FROM public.leave_type_display_config LIMIT 1) THEN
    RETURN QUERY
      SELECT
        lt.id            AS leave_type_id,
        lt.name          AS leave_type_name,
        lt.days_allowed  AS days_allowed,
        dc.display_order AS display_order,
        dc.category      AS category
      FROM public.leave_type_display_config dc
      JOIN public.leave_types lt ON lt.id = dc.leave_type_id
      WHERE dc.is_visible = true
      ORDER BY
        CASE dc.category WHEN 'primary' THEN 0 ELSE 1 END,
        dc.display_order;
  ELSE
    -- Fallback: all leave types alphabetically, all as primary
    RETURN QUERY
      SELECT
        lt.id           AS leave_type_id,
        lt.name         AS leave_type_name,
        lt.days_allowed AS days_allowed,
        0               AS display_order,
        'primary'::TEXT AS category
      FROM public.leave_types lt
      ORDER BY lt.name;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_leave_types IS
  'Returns leave types ordered and filtered by display config for the employee dashboard. Falls back to all types alphabetically if no config exists.';
