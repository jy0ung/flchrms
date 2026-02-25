-- Strict server-side masking for admin-facing employee directory profile reads.
-- Admin retains broad app-config access but should not receive sensitive employee identifiers/contact values.

CREATE OR REPLACE FUNCTION public.get_employee_directory_profiles(_profile_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  employee_id text,
  email text,
  username text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  department_id uuid,
  job_title text,
  hire_date date,
  manager_id uuid,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  department jsonb
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH caller AS (
    SELECT public.has_role(public.request_user_id(), 'admin'::public.app_role) AS is_admin
  )
  SELECT
    p.id,
    CASE WHEN caller.is_admin THEN NULL ELSE p.employee_id END AS employee_id,
    p.email,
    p.username,
    p.first_name,
    p.last_name,
    CASE WHEN caller.is_admin THEN NULL ELSE p.phone END AS phone,
    p.avatar_url,
    p.department_id,
    p.job_title,
    p.hire_date,
    p.manager_id,
    p.status,
    p.created_at,
    p.updated_at,
    CASE
      WHEN d.id IS NULL THEN NULL
      ELSE jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'description', d.description,
        'manager_id', d.manager_id,
        'created_at', d.created_at,
        'updated_at', d.updated_at
      )
    END AS department
  FROM public.profiles p
  LEFT JOIN public.departments d
    ON d.id = p.department_id
  CROSS JOIN caller
  WHERE _profile_id IS NULL OR p.id = _profile_id
  ORDER BY p.first_name, p.last_name;
$$;

REVOKE ALL ON FUNCTION public.get_employee_directory_profiles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_directory_profiles(uuid) TO authenticated, service_role;
