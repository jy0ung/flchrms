-- =============================================================================
-- Migration: profile_change_log audit table + trigger
-- Purpose:   Record all significant changes to employee profiles for audit
--            trail purposes. Logs per-field changes on UPDATE and a single
--            'create' row on INSERT.
-- =============================================================================

-- ── Audit table ──────────────────────────────────────────────────────────
CREATE TABLE public.profile_change_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_by  uuid,       -- auth.uid() of the actor; NULL for system/trigger-originated
  changed_at  timestamptz NOT NULL DEFAULT now(),
  change_type text        NOT NULL CHECK (change_type IN ('create', 'update', 'archive', 'restore')),
  field_name  text,       -- NULL for create/archive/restore entries
  old_value   text,
  new_value   text
);

-- Performance index for per-employee audit lookups
CREATE INDEX idx_profile_change_log_profile_date
  ON public.profile_change_log (profile_id, changed_at DESC);

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.profile_change_log ENABLE ROW LEVEL SECURITY;

-- Only HR, Admin, Director can read audit logs
CREATE POLICY profile_change_log_select_authorized
  ON public.profile_change_log FOR SELECT TO authenticated
  USING (
    public.has_role(public.request_user_id(), 'hr'::public.app_role)
    OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
    OR public.has_role(public.request_user_id(), 'director'::public.app_role)
  );

-- No INSERT/UPDATE/DELETE policies for authenticated — the trigger function
-- uses SECURITY DEFINER which bypasses RLS.

-- ── Trigger function ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  actor_id UUID;
  v_change_type TEXT;
  col_name TEXT;
  old_val TEXT;
  new_val TEXT;
  monitored_columns TEXT[] := ARRAY[
    'first_name', 'last_name', 'email', 'username', 'phone',
    'job_title', 'department_id', 'employee_id', 'status',
    'hire_date', 'manager_id'
  ];
BEGIN
  -- Attempt to capture the current user; will be NULL in trigger-chains
  BEGIN
    actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    actor_id := NULL;
  END;

  -- ── INSERT → log a single 'create' entry ──────────────────────────────
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profile_change_log (profile_id, changed_by, change_type)
    VALUES (NEW.id, actor_id, 'create');
    RETURN NEW;
  END IF;

  -- ── UPDATE → log per-field diffs ──────────────────────────────────────
  IF TG_OP = 'UPDATE' THEN
    -- Detect archive / restore transitions
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'terminated' AND OLD.status <> 'terminated' THEN
        v_change_type := 'archive';
      ELSIF OLD.status = 'terminated' AND NEW.status <> 'terminated' THEN
        v_change_type := 'restore';
      END IF;

      -- Log the status-specific event if it was archive/restore
      IF v_change_type IS NOT NULL THEN
        INSERT INTO public.profile_change_log (profile_id, changed_by, change_type, field_name, old_value, new_value)
        VALUES (NEW.id, actor_id, v_change_type, 'status', OLD.status, NEW.status);
      END IF;
    END IF;

    -- Log every changed monitored column (including status if it wasn't archive/restore)
    FOREACH col_name IN ARRAY monitored_columns LOOP
      EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', col_name, col_name)
        INTO old_val, new_val
        USING OLD, NEW;

      IF old_val IS DISTINCT FROM new_val THEN
        -- Skip status if we already logged it as archive/restore
        IF col_name = 'status' AND v_change_type IS NOT NULL THEN
          CONTINUE;
        END IF;

        INSERT INTO public.profile_change_log (profile_id, changed_by, change_type, field_name, old_value, new_value)
        VALUES (NEW.id, actor_id, 'update', col_name, old_val, new_val);
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- ── Bind trigger ────────────────────────────────────────────────────────
CREATE TRIGGER trg_log_profile_changes
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_changes();

COMMENT ON TABLE public.profile_change_log IS
  'Audit trail for all profile changes. Each row represents a single field change or lifecycle event (create/archive/restore).';

COMMENT ON FUNCTION public.log_profile_changes IS
  'Trigger function that logs per-field diffs on profile UPDATE and a create entry on INSERT.';
