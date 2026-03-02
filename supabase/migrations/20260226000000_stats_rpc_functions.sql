-- Consolidate dashboard & executive stats into single-call RPCs
-- Eliminates 15-20 individual HTTP requests per dashboard load

-- ============================================================
-- get_dashboard_stats: returns 5 counts in one round-trip
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _today date := current_date;
  _total_employees bigint;
  _present_today bigint;
  _pending_leaves bigint;
  _active_trainings bigint;
  _upcoming_reviews bigint;
BEGIN
  SELECT count(*) INTO _total_employees
    FROM profiles WHERE status = 'active';

  SELECT count(*) INTO _present_today
    FROM attendance
   WHERE date = _today AND status IN ('present', 'late');

  SELECT count(*) INTO _pending_leaves
    FROM leave_requests
   WHERE final_approved_at IS NULL
     AND status NOT IN ('rejected', 'cancelled');

  SELECT count(*) INTO _active_trainings
    FROM training_enrollments
   WHERE status IN ('enrolled', 'in_progress');

  SELECT count(*) INTO _upcoming_reviews
    FROM performance_reviews
   WHERE status = 'draft';

  RETURN json_build_object(
    'totalEmployees',  _total_employees,
    'presentToday',    _present_today,
    'pendingLeaves',   _pending_leaves,
    'activeTrainings', _active_trainings,
    'upcomingReviews', _upcoming_reviews
  );
END;
$$;

-- ============================================================
-- get_executive_stats: returns all executive KPIs in one call
-- Optional department_id param for manager-scoped view
-- ============================================================
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
  _total_employees bigint;
  _active_employees bigint;
  _new_hires bigint;
  _present_today bigint;
  _month_attendance bigint;
  _pending_leaves bigint;
  _approved_leaves bigint;
  _on_leave_today bigint;
  _active_trainings bigint;
  _completed_trainings bigint;
  _total_enrollments bigint;
  _completed_enrollments bigint;
  _pending_reviews bigint;
  _completed_reviews bigint;
  _dept_name text;
  _emp_ids uuid[];
BEGIN
  -- Get department name if scoped
  IF _department_id IS NOT NULL THEN
    SELECT name INTO _dept_name FROM departments WHERE id = _department_id;
  END IF;

  -- Profile counts
  SELECT count(*) INTO _total_employees
    FROM profiles WHERE (_department_id IS NULL OR department_id = _department_id);

  SELECT count(*) INTO _active_employees
    FROM profiles WHERE status = 'active'
      AND (_department_id IS NULL OR department_id = _department_id);

  SELECT count(*) INTO _new_hires
    FROM profiles
   WHERE hire_date >= _month_start AND hire_date <= _month_end
     AND (_department_id IS NULL OR department_id = _department_id);

  -- Collect employee IDs for department-scoped non-profile queries
  IF _department_id IS NOT NULL THEN
    SELECT array_agg(id) INTO _emp_ids
      FROM profiles WHERE department_id = _department_id;

    IF _emp_ids IS NULL OR array_length(_emp_ids, 1) IS NULL THEN
      RETURN json_build_object(
        'totalEmployees', _total_employees,
        'activeEmployees', _active_employees,
        'newHiresThisMonth', _new_hires,
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
  END IF;

  -- Attendance
  SELECT count(*) INTO _present_today
    FROM attendance
   WHERE date = _today AND status IN ('present', 'late')
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _month_attendance
    FROM attendance
   WHERE date >= _month_start AND date <= _today
     AND status IN ('present', 'late')
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  -- Leave
  SELECT count(*) INTO _pending_leaves
    FROM leave_requests
   WHERE final_approved_at IS NULL
     AND status NOT IN ('rejected', 'cancelled')
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _approved_leaves
    FROM leave_requests
   WHERE final_approved_at IS NOT NULL
     AND status NOT IN ('cancelled', 'rejected')
     AND start_date >= _month_start AND start_date <= _month_end
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _on_leave_today
    FROM leave_requests
   WHERE final_approved_at IS NOT NULL
     AND status NOT IN ('cancelled', 'rejected')
     AND start_date <= _today AND end_date >= _today
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  -- Training
  SELECT count(*) INTO _active_trainings
    FROM training_enrollments
   WHERE status IN ('enrolled', 'in_progress')
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _completed_trainings
    FROM training_enrollments
   WHERE status = 'completed'
     AND completed_at >= _month_start AND completed_at <= _month_end
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _total_enrollments
    FROM training_enrollments
   WHERE (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _completed_enrollments
    FROM training_enrollments
   WHERE status = 'completed'
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  -- Performance
  SELECT count(*) INTO _pending_reviews
    FROM performance_reviews
   WHERE status = 'draft'
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  SELECT count(*) INTO _completed_reviews
    FROM performance_reviews
   WHERE status IN ('submitted', 'acknowledged', 'completed')
     AND submitted_at >= _month_start AND submitted_at <= _month_end
     AND (_department_id IS NULL OR employee_id = ANY(_emp_ids));

  RETURN json_build_object(
    'totalEmployees', _total_employees,
    'activeEmployees', _active_employees,
    'newHiresThisMonth', _new_hires,
    'presentToday', _present_today,
    'absentToday', GREATEST(0, _active_employees - _present_today - _on_leave_today),
    'attendanceRate', CASE WHEN _active_employees > 0
      THEN round((_present_today::numeric / _active_employees) * 100)
      ELSE 0 END,
    'avgAttendanceThisMonth', LEAST(100, CASE
      WHEN _active_employees > 0
      THEN round((_month_attendance::numeric /
        GREATEST(1, _active_employees * GREATEST(1,
          -- approximate working days (exclude weekends)
          (SELECT count(*) FROM generate_series(_month_start, _today, '1 day'::interval) d
           WHERE extract(dow FROM d) NOT IN (0, 6))
        ))) * 100)
      ELSE 0 END),
    'pendingLeaveRequests', _pending_leaves,
    'approvedLeavesThisMonth', _approved_leaves,
    'onLeaveToday', _on_leave_today,
    'activeTrainings', _active_trainings,
    'completedTrainingsThisMonth', _completed_trainings,
    'trainingCompletionRate', CASE WHEN _total_enrollments > 0
      THEN round((_completed_enrollments::numeric / _total_enrollments) * 100)
      ELSE 0 END,
    'pendingReviews', _pending_reviews,
    'completedReviewsThisMonth', _completed_reviews,
    'departmentName', _dept_name,
    'departmentEmployeeCount', CASE WHEN _department_id IS NOT NULL
      THEN _active_employees ELSE NULL END
  );
END;
$$;

-- Grant execute to authenticated users (RLS on underlying tables still applies)
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_executive_stats(uuid) TO authenticated;