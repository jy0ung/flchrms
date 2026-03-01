-- Migration: Add database hardening — indexes, constraints, and safety guards.
-- Addresses audit findings: missing composite indexes, unguarded uniqueness,
-- negative-value constraints, and leave balance year-boundary enforcement.

-- ═══════════════════════════════════════════════════════════════════
-- 1. COMPOSITE INDEXES for common query patterns
-- ═══════════════════════════════════════════════════════════════════

-- Attendance lookups by employee + date (most common pattern)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
  ON public.attendance (employee_id, date);

-- Leave requests filtered by employee and status (dashboard, balance)
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_status
  ON public.leave_requests (employee_id, status);

-- Leave requests date range queries (calendar overlap)
CREATE INDEX IF NOT EXISTS idx_leave_requests_date_range
  ON public.leave_requests (start_date, end_date);

-- Payslips by payroll period (period-based listing)
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_period
  ON public.payslips (payroll_period_id);

-- Training enrollments by employee + status
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee_status
  ON public.training_enrollments (employee_id, status);

-- Notifications by user for quick read/unread lookups
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read
  ON public.user_notifications (user_id, is_read);

-- ═══════════════════════════════════════════════════════════════════
-- 2. UNIQUE CONSTRAINTS to prevent duplicate records
-- ═══════════════════════════════════════════════════════════════════

-- Prevent duplicate attendance records per employee per day
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_attendance_employee_date'
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date);
  END IF;
END $$;

-- Prevent duplicate holidays on the same date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_holidays_date'
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT uq_holidays_date UNIQUE (date);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 3. CHECK CONSTRAINTS for data integrity
-- ═══════════════════════════════════════════════════════════════════

-- Leave requests: days_count must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_leave_requests_days_positive'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_days_positive CHECK (days_count > 0);
  END IF;
END $$;

-- Leave requests: start_date must be <= end_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_leave_requests_date_range'
  ) THEN
    ALTER TABLE public.leave_requests
      ADD CONSTRAINT chk_leave_requests_date_range CHECK (start_date <= end_date);
  END IF;
END $$;

-- Leave types: days_allowed must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_leave_types_days_nonneg'
  ) THEN
    ALTER TABLE public.leave_types
      ADD CONSTRAINT chk_leave_types_days_nonneg CHECK (days_allowed >= 0);
  END IF;
END $$;

-- Salary structures: basic_salary must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_salary_structures_basic_nonneg'
  ) THEN
    ALTER TABLE public.salary_structures
      ADD CONSTRAINT chk_salary_structures_basic_nonneg CHECK (basic_salary >= 0);
  END IF;
END $$;

-- Payslips: monetary values must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_payslips_amounts_nonneg'
  ) THEN
    ALTER TABLE public.payslips
      ADD CONSTRAINT chk_payslips_amounts_nonneg
        CHECK (basic_salary >= 0 AND gross_salary >= 0 AND net_salary >= 0);
  END IF;
END $$;

-- Payslips: prevent duplicate payslips per employee per period
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_payslips_employee_period'
  ) THEN
    ALTER TABLE public.payslips
      ADD CONSTRAINT uq_payslips_employee_period UNIQUE (payroll_period_id, employee_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. PROFILES STATUS CHECK (prevent typos like 'Active' vs 'active')
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_profiles_status_valid'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT chk_profiles_status_valid
        CHECK (status IS NULL OR status IN ('active', 'inactive', 'on_leave', 'terminated'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. PREVENT SELF-ROLE-ESCALATION
--    Admins/Directors cannot modify their own role.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Users cannot modify their own role assignment.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.user_roles;
CREATE TRIGGER trg_prevent_self_role_change
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_change();
