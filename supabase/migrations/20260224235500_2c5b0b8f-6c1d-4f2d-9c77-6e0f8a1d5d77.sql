-- Calendar-safe leave feed for all authenticated users (without widening leave_requests table SELECT)

CREATE OR REPLACE FUNCTION public.get_calendar_visible_leaves(
  _start_date DATE,
  _end_date DATE
)
RETURNS TABLE (
  id UUID,
  start_date DATE,
  end_date DATE,
  status TEXT,
  final_approved_at TIMESTAMPTZ,
  employee_first_name TEXT,
  employee_last_name TEXT,
  leave_type_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF public.request_user_id() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _start_date IS NULL OR _end_date IS NULL THEN
    RAISE EXCEPTION 'Start and end dates are required'
      USING ERRCODE = '22004';
  END IF;

  RETURN QUERY
  SELECT
    lr.id,
    lr.start_date,
    lr.end_date,
    lr.status,
    lr.final_approved_at,
    p.first_name AS employee_first_name,
    p.last_name AS employee_last_name,
    lt.name AS leave_type_name
  FROM public.leave_requests lr
  JOIN public.profiles p
    ON p.id = lr.employee_id
  JOIN public.leave_types lt
    ON lt.id = lr.leave_type_id
  WHERE lr.final_approved_at IS NOT NULL
    AND lr.status NOT IN ('cancelled', 'rejected')
    AND lr.start_date <= _end_date
    AND lr.end_date >= _start_date
  ORDER BY lr.start_date ASC, p.first_name ASC, p.last_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_calendar_visible_leaves(DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_visible_leaves(DATE, DATE) TO authenticated, service_role;

ANALYZE public.leave_requests;
