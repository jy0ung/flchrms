-- Employee lifecycle: extended profile fields, lifecycle events, onboarding checklists.

BEGIN;

-- ── Extended profile columns ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern')),
  ADD COLUMN IF NOT EXISTS probation_end_date date,
  ADD COLUMN IF NOT EXISTS work_location text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS national_id text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS bank_account text;

-- ── Employee lifecycle events ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'hired', 'probation_started', 'probation_ended',
    'promoted', 'transferred', 'role_changed',
    'suspended', 'reinstated', 'resigned', 'terminated',
    'contract_renewed', 'salary_revised', 'custom'
  )),
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_employee
  ON public.employee_lifecycle_events (employee_id, event_date DESC);

-- ── Onboarding checklists ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.onboarding_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general' CHECK (category IN (
    'documents', 'system_access', 'training', 'equipment', 'general'
  )),
  item_name text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_employee
  ON public.onboarding_checklists (employee_id, category);

CREATE OR REPLACE TRIGGER update_onboarding_checklists_updated_at
  BEFORE UPDATE ON public.onboarding_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Default onboarding template function ─────────────────────────────────────
-- HR/admin can call this after creating an employee to seed the checklist.
CREATE OR REPLACE FUNCTION public.seed_onboarding_checklist(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow HR, admin, director to call
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'director'::app_role)
  ) THEN
    RAISE EXCEPTION 'Permission denied: only HR, admin, or director can seed onboarding checklists';
  END IF;

  -- Skip if checklist already exists for this employee
  IF EXISTS (SELECT 1 FROM onboarding_checklists WHERE employee_id = p_employee_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO onboarding_checklists (employee_id, category, item_name, sort_order) VALUES
    (p_employee_id, 'documents',      'Submit IC/Passport copy',              1),
    (p_employee_id, 'documents',      'Submit bank account details',          2),
    (p_employee_id, 'documents',      'Submit emergency contact form',        3),
    (p_employee_id, 'documents',      'Sign employment contract',            4),
    (p_employee_id, 'documents',      'Submit educational certificates',      5),
    (p_employee_id, 'system_access',  'Create email account',                1),
    (p_employee_id, 'system_access',  'Set up HRMS account',                 2),
    (p_employee_id, 'system_access',  'Issue access card/badge',             3),
    (p_employee_id, 'system_access',  'Configure system permissions',        4),
    (p_employee_id, 'training',       'Company orientation session',          1),
    (p_employee_id, 'training',       'Department introduction',             2),
    (p_employee_id, 'training',       'Safety & compliance briefing',        3),
    (p_employee_id, 'training',       'Role-specific training',              4),
    (p_employee_id, 'equipment',      'Assign workstation/desk',             1),
    (p_employee_id, 'equipment',      'Issue laptop/computer',               2),
    (p_employee_id, 'equipment',      'Provide office supplies',             3);
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.seed_onboarding_checklist(uuid) TO authenticated;

-- ── RLS for employee_lifecycle_events ────────────────────────────────────────
ALTER TABLE public.employee_lifecycle_events ENABLE ROW LEVEL SECURITY;

-- Employees can read their own lifecycle events
CREATE POLICY lifecycle_events_select_own
  ON public.employee_lifecycle_events FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- HR/admin/director can read all lifecycle events
CREATE POLICY lifecycle_events_select_hr_admin_director
  ON public.employee_lifecycle_events FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

-- Manager can read their reports' lifecycle events
CREATE POLICY lifecycle_events_select_manager
  ON public.employee_lifecycle_events FOR SELECT TO authenticated
  USING (
    public.is_manager_of(auth.uid(), employee_id)
  );

-- HR/admin/director can insert/update lifecycle events
CREATE POLICY lifecycle_events_insert_hr_admin_director
  ON public.employee_lifecycle_events FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

CREATE POLICY lifecycle_events_update_hr_admin_director
  ON public.employee_lifecycle_events FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

CREATE POLICY lifecycle_events_delete_hr_admin_director
  ON public.employee_lifecycle_events FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

-- ── RLS for onboarding_checklists ────────────────────────────────────────────
ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;

-- Employees can read their own checklist
CREATE POLICY onboarding_select_own
  ON public.onboarding_checklists FOR SELECT TO authenticated
  USING (employee_id = auth.uid());

-- HR/admin/director can read all checklists
CREATE POLICY onboarding_select_hr_admin_director
  ON public.onboarding_checklists FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

-- Manager can read their reports' checklists
CREATE POLICY onboarding_select_manager
  ON public.onboarding_checklists FOR SELECT TO authenticated
  USING (
    public.is_manager_of(auth.uid(), employee_id)
  );

-- HR/admin/director can insert/update/delete checklists
CREATE POLICY onboarding_insert_hr_admin_director
  ON public.onboarding_checklists FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

CREATE POLICY onboarding_update_hr_admin_director
  ON public.onboarding_checklists FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

CREATE POLICY onboarding_delete_hr_admin_director
  ON public.onboarding_checklists FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'hr'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'director'::public.app_role)
  );

-- ── Auto-create "hired" lifecycle event on profile creation ──────────────────
CREATE OR REPLACE FUNCTION public.auto_create_hired_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO employee_lifecycle_events (employee_id, event_type, event_date, title)
  VALUES (
    NEW.id,
    'hired',
    COALESCE(NEW.hire_date, CURRENT_DATE),
    'Joined ' || COALESCE(
      (SELECT name FROM departments WHERE id = NEW.department_id),
      'the company'
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_auto_create_hired_event
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_hired_event();

COMMIT;
