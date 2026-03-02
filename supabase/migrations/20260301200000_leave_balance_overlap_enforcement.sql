-- Migration: Leave balance enforcement & overlapping leave detection (DB-level)
-- These triggers run BEFORE INSERT on leave_requests to guarantee data integrity
-- regardless of which client or API path creates the request.

-- ============================================================
-- 1. Prevent overlapping leave requests for the same employee
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_leave_overlap()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _overlap_count int;
BEGIN
  SELECT count(*) INTO _overlap_count
    FROM leave_requests
   WHERE employee_id = NEW.employee_id
     AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND status NOT IN ('rejected', 'cancelled')
     AND start_date <= NEW.end_date
     AND end_date >= NEW.start_date;

  IF _overlap_count > 0 THEN
    RAISE EXCEPTION 'Leave request overlaps with an existing leave request for the same period.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_leave_overlap ON public.leave_requests;
CREATE TRIGGER trg_check_leave_overlap
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_leave_overlap();

-- ============================================================
-- 2. Enforce leave balance (days_used + new request <= days_allowed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_leave_balance()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _days_allowed int;
  _days_used numeric;
  _fiscal_year_start date;
BEGIN
  -- Get allowance for this leave type
  SELECT days_allowed INTO _days_allowed
    FROM leave_types
   WHERE id = NEW.leave_type_id;

  IF _days_allowed IS NULL THEN
    RAISE EXCEPTION 'Leave type not found.' USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- A days_allowed of 0 means unlimited (e.g. unpaid leave)
  IF _days_allowed = 0 THEN
    RETURN NEW;
  END IF;

  -- Calculate fiscal year boundary (calendar year)
  _fiscal_year_start := date_trunc('year', NEW.start_date)::date;

  -- Sum days already used or pending in this fiscal year for this leave type
  SELECT COALESCE(sum(days_count), 0) INTO _days_used
    FROM leave_requests
   WHERE employee_id = NEW.employee_id
     AND leave_type_id = NEW.leave_type_id
     AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND status NOT IN ('rejected', 'cancelled')
     AND start_date >= _fiscal_year_start;

  IF (_days_used + NEW.days_count) > _days_allowed THEN
    RAISE EXCEPTION 'Insufficient leave balance. Used: % days, Requesting: % days, Allowed: % days per year.',
      _days_used, NEW.days_count, _days_allowed
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_leave_balance ON public.leave_requests;
CREATE TRIGGER trg_check_leave_balance
  BEFORE INSERT ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.check_leave_balance();
