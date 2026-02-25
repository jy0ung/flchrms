-- Allow employees to cancel pending leave or request cancellation after final approval
-- without widening direct UPDATE RLS on public.leave_requests.

CREATE OR REPLACE FUNCTION public.request_leave_cancellation(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
BEGIN
  requester_id := public.request_user_id();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF _request_id IS NULL THEN
    RAISE EXCEPTION 'Leave request is required'
      USING ERRCODE = '22004';
  END IF;

  SELECT *
  INTO request_row
  FROM public.leave_requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF request_row.employee_id <> requester_id THEN
    RAISE EXCEPTION 'You can only cancel your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RETURN;
  END IF;

  IF request_row.status = 'rejected' THEN
    RAISE EXCEPTION 'Rejected leave requests cannot be cancelled'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.status <> 'pending' AND request_row.final_approved_at IS NULL THEN
    RAISE EXCEPTION 'Only pending or fully approved leave requests can be cancelled'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.leave_requests
  SET status = 'cancelled'
  WHERE id = _request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_leave_cancellation(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_leave_cancellation(UUID) TO authenticated, service_role;
