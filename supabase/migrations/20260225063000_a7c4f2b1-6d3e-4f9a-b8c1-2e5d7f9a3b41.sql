-- Phase 4D: dedicated leave amendment RPC for rejected/pending-document resubmission flows

CREATE OR REPLACE FUNCTION public.amend_leave_request(
  _request_id UUID,
  _amendment_notes TEXT,
  _reason TEXT DEFAULT NULL,
  _document_url TEXT DEFAULT NULL
)
RETURNS public.leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  requester_id UUID;
  request_row public.leave_requests%ROWTYPE;
  amended_row public.leave_requests%ROWTYPE;
  trimmed_notes TEXT := NULLIF(pg_catalog.btrim(COALESCE(_amendment_notes, '')), '');
  trimmed_reason TEXT := CASE
    WHEN _reason IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_reason), '')
  END;
  trimmed_document_url TEXT := CASE
    WHEN _document_url IS NULL THEN NULL
    ELSE NULLIF(pg_catalog.btrim(_document_url), '')
  END;
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

  IF trimmed_notes IS NULL THEN
    RAISE EXCEPTION 'Amendment notes are required'
      USING ERRCODE = '22023';
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
    RAISE EXCEPTION 'You can only amend your own leave requests'
      USING ERRCODE = '42501';
  END IF;

  IF request_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled leave requests cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.final_approved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Final-approved leave requests cannot be amended; use cancellation workflow'
      USING ERRCODE = '22023';
  END IF;

  IF request_row.cancellation_status IS NOT NULL THEN
    RAISE EXCEPTION 'Leave requests with cancellation workflow state cannot be amended'
      USING ERRCODE = '22023';
  END IF;

  IF NOT (
    request_row.status = 'rejected'
    OR (request_row.status = 'pending' AND coalesce(request_row.document_required, false) = true)
  ) THEN
    RAISE EXCEPTION 'Only rejected requests or pending requests with requested documents can be amended'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.leave_requests
  SET status = 'pending',
      amendment_notes = trimmed_notes,
      amended_at = now(),
      reason = COALESCE(trimmed_reason, public.leave_requests.reason),
      document_url = CASE
        WHEN _document_url IS NULL THEN public.leave_requests.document_url
        ELSE trimmed_document_url
      END
  WHERE id = _request_id
  RETURNING * INTO amended_row;

  RETURN amended_row;
END;
$$;

REVOKE ALL ON FUNCTION public.amend_leave_request(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.amend_leave_request(UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;
