-- Migration: Optimize get_executive_stats to use CTEs for fewer table scans
-- Replaces the sequential individual SELECT approach with grouped CTEs

CREATE OR REPLACE FUNCTION public.get_executive_stats(
  _department_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _today date := current_date;
  _month_start date := date_trunc('month', current_date)::date;
  _month_end date := (date_trunc('month', current_date) + interval '1 month' - interval '1 day')::date;
  _result json;
  _dept_name text;
  _emp_ids uuid[];
  _active_employees bigint;
BEGIN
  -- Get department name if scoped
  IF _department_id IS NOT NULL THEN
    SELECT name INTO _dept_name FROM departments WHERE id = _department_id;
    SELECT array_agg(id) INTO _emp_ids
      FROM profiles WHERE department_id = _department_id;
  END IF;

  -- Early exit for empty department
  IF _department_id IS NOT NULL AND (_emp_ids IS NULL OR array_length(_emp_ids, 1) IS NULL) THEN
    SELECT count(*) INTO _active_employees
      FROM profiles WHERE status = 'active' AND department_id = _department_id;

    RETURN json_build_object(
      'totalEmployees', COALESCE((SELECT count(*) FROM profiles WHERE department_id = _department_id), 0),
      'activeEmployees', _active_employees,
      'newHiresThisMonth', 0,
      'presentToday', 0,
      'absentToday', _active_employees,
      'attendanceRate', 0,
      'avgAttendanceThisMonth', 0,
      'pendingLeaveRequests', 0,
      'approvedLeavesThisMonth', 0,
      'onLeaveToday', 0,
      'activeTrainings', 0,
      'completedTrainingsThisMonth', 0,
      'trainingCompletionRate', 0,
      'pendingReviews', 0,
      'completedReviewsThisMonth', 0,
      'departmentName', _dept_name,
      'departmentEmployeeCount', _active_employees
    );
  END IF;

  -- Single query that computes all stats via CTEs
  SELECT json_build_object(
    'totalEmployees',            p.total_employees,
    'activeEmployees',           p.active_employees,
    'newHiresThisMonth',         p.new_hires,
    'presentToday',              a.present_today,
    'absentToday',               GREATEST(0, p.active_employees - a.present_today - l.on_leave_today),
    'attendanceRate',            CASE WHEN p.active_employees > 0
                                   THEN round((a.present_today::numeric / p.active_employees) * 100)
                                   ELSE 0 END,
    'avgAttendanceThisMonth',    LEAST(100, CASE WHEN p.active_employees > 0
                                   THEN round((a.month_attendance::numeric /
                                     GREATEST(1, p.active_employees * GREATEST(1, wd.working_days))) * 100)
                                   ELSE 0 END),
    'pendingLeaveRequests',      l.pending_leaves,
    'approvedLeavesThisMonth',   l.approved_leaves,
    'onLeaveToday',              l.on_leave_today,
    'activeTrainings',           t.active_trainings,
    'completedTrainingsThisMonth', t.completed_trainings,
    'trainingCompletionRate',    CASE WHEN t.total_enrollments > 0
                                   THEN round((t.completed_enrollments::numeric / t.total_enrollments) * 100)
                                   ELSE 0 END,
    'pendingReviews',            r.pending_reviews,
    'completedReviewsThisMonth', r.completed_reviews,
    'departmentName',            _dept_name,
    'departmentEmployeeCount',   CASE WHEN _department_id IS NOT NULL
                                   THEN p.active_employees ELSE NULL END
  ) INTO _result
  FROM
    -- Profile stats CTE
    (SELECT
       count(*) AS total_employees,
       count(*) FILTER (WHERE status = 'active') AS active_employees,
       count(*) FILTER (WHERE hire_date >= _month_start AND hire_date <= _month_end) AS new_hires
     FROM profiles
     WHERE (_department_id IS NULL OR department_id = _department_id)
    ) p,
    -- Attendance stats CTE
    (SELECT
       count(*) FILTER (WHERE date = _today AND status IN ('present', 'late')) AS present_today,
       count(*) FILTER (WHERE date >= _month_start AND date <= _today AND status IN ('present', 'late')) AS month_attendance
     FROM attendance
     WHERE (_department_id IS NULL OR employee_id = ANY(_emp_ids))
       AND date >= _month_start AND date <= _today
    ) a,
    -- Leave stats CTE
    (SELECT
       count(*) FILTER (WHERE final_approved_at IS NULL AND status NOT IN ('rejected', 'cancelled')) AS pending_leaves,
       count(*) FILTER (WHERE final_approved_at IS NOT NULL AND status NOT IN ('cancelled', 'rejected')
         AND start_date >= _month_start AND start_date <= _month_end) AS approved_leaves,
       count(*) FILTER (WHERE final_approved_at IS NOT NULL AND status NOT IN ('cancelled', 'rejected')
         AND start_date <= _today AND end_date >= _today) AS on_leave_today
     FROM leave_requests
     WHERE (_department_id IS NULL OR employee_id = ANY(_emp_ids))
    ) l,
    -- Training stats CTE
    (SELECT
       count(*) FILTER (WHERE status IN ('enrolled', 'in_progress')) AS active_trainings,
       count(*) FILTER (WHERE status = 'completed' AND completed_at >= _month_start AND completed_at <= _month_end) AS completed_trainings,
       count(*) AS total_enrollments,
       count(*) FILTER (WHERE status = 'completed') AS completed_enrollments
     FROM training_enrollments
     WHERE (_department_id IS NULL OR employee_id = ANY(_emp_ids))
    ) t,
    -- Performance review stats CTE
    (SELECT
       count(*) FILTER (WHERE status = 'draft') AS pending_reviews,
       count(*) FILTER (WHERE status IN ('submitted', 'acknowledged', 'completed')
         AND submitted_at >= _month_start AND submitted_at <= _month_end) AS completed_reviews
     FROM performance_reviews
     WHERE (_department_id IS NULL OR employee_id = ANY(_emp_ids))
    ) r,
    -- Working days CTE
    (SELECT count(*) AS working_days
     FROM generate_series(_month_start, _today, '1 day'::interval) d
     WHERE extract(dow FROM d) NOT IN (0, 6)
    ) wd;

  RETURN _result;
END;
$$;

-- Also optimize get_dashboard_stats using FILTER aggregates on a single scan
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _today date := current_date;
  _result json;
BEGIN
  SELECT json_build_object(
    'totalEmployees',  (SELECT count(*) FROM profiles WHERE status = 'active'),
    'presentToday',    (SELECT count(*) FROM attendance WHERE date = _today AND status IN ('present', 'late')),
    'pendingLeaves',   (SELECT count(*) FROM leave_requests WHERE final_approved_at IS NULL AND status NOT IN ('rejected', 'cancelled')),
    'activeTrainings', (SELECT count(*) FROM training_enrollments WHERE status IN ('enrolled', 'in_progress')),
    'upcomingReviews', (SELECT count(*) FROM performance_reviews WHERE status = 'draft')
  ) INTO _result;

  RETURN _result;
END;
$$;
