-- Configurable leave approval workflows (HR/Admin managed)

CREATE TABLE IF NOT EXISTS public.leave_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_role public.app_role NOT NULL UNIQUE,
  approval_stages TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_leave_approval_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  stage TEXT;
  seen TEXT[] := ARRAY[]::TEXT[];
  stage_count INTEGER;
BEGIN
  stage_count := coalesce(array_length(NEW.approval_stages, 1), 0);

  IF stage_count = 0 THEN
    RAISE EXCEPTION 'approval_stages must contain at least one stage'
      USING ERRCODE = '23514';
  END IF;

  FOREACH stage IN ARRAY NEW.approval_stages LOOP
    IF stage NOT IN ('manager', 'general_manager', 'director', 'hr') THEN
      RAISE EXCEPTION 'Invalid approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    IF stage = ANY(seen) THEN
      RAISE EXCEPTION 'Duplicate approval stage: %', stage
        USING ERRCODE = '23514';
    END IF;

    seen := array_append(seen, stage);
  END LOOP;

  IF NEW.approval_stages[stage_count] <> 'hr' THEN
    RAISE EXCEPTION 'approval_stages must end with hr'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validate_leave_approval_workflow_stages() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS validate_leave_approval_workflows_stages ON public.leave_approval_workflows;
CREATE TRIGGER validate_leave_approval_workflows_stages
BEFORE INSERT OR UPDATE OF approval_stages
ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.validate_leave_approval_workflow_stages();

DROP TRIGGER IF EXISTS update_leave_approval_workflows_updated_at ON public.leave_approval_workflows;
CREATE TRIGGER update_leave_approval_workflows_updated_at
BEFORE UPDATE ON public.leave_approval_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.leave_approval_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leave approval workflows viewable by authenticated users" ON public.leave_approval_workflows;
CREATE POLICY "Leave approval workflows viewable by authenticated users"
ON public.leave_approval_workflows
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "HR and Admin can manage leave approval workflows" ON public.leave_approval_workflows;
CREATE POLICY "HR and Admin can manage leave approval workflows"
ON public.leave_approval_workflows
FOR ALL
TO authenticated
USING (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
)
WITH CHECK (
  public.has_role(public.request_user_id(), 'hr'::public.app_role)
  OR public.has_role(public.request_user_id(), 'admin'::public.app_role)
);

INSERT INTO public.leave_approval_workflows (requester_role, approval_stages, is_active, notes)
VALUES
  ('employee', ARRAY['manager', 'general_manager', 'hr']::TEXT[], true, 'Default employee route'),
  ('manager', ARRAY['general_manager', 'hr']::TEXT[], true, 'Default manager route'),
  ('general_manager', ARRAY['general_manager', 'director', 'hr']::TEXT[], true, 'Default GM route'),
  ('director', ARRAY['hr']::TEXT[], true, 'Default director route'),
  ('hr', ARRAY['hr']::TEXT[], true, 'Default HR route'),
  ('admin', ARRAY['hr']::TEXT[], true, 'Default admin route')
ON CONFLICT (requester_role) DO UPDATE
SET approval_stages = EXCLUDED.approval_stages,
    is_active = EXCLUDED.is_active,
    notes = COALESCE(public.leave_approval_workflows.notes, EXCLUDED.notes);
