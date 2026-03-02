-- Consolidate the 5 independent admin notification polling queries into a single
-- RPC that returns all dashboard data in one round-trip.

CREATE OR REPLACE FUNCTION notification_admin_combined_dashboard(
  _queue_status text DEFAULT 'all',
  _queue_limit  int  DEFAULT 25,
  _queue_offset int  DEFAULT 0,
  _run_status   text DEFAULT 'all',
  _run_limit    int  DEFAULT 8,
  _run_offset   int  DEFAULT 0,
  _dl_window_hours int DEFAULT 24,
  _dl_limit     int  DEFAULT 8
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_summary  json;
  v_queue_list     json;
  v_worker_summary json;
  v_worker_runs    json;
  v_dead_letter    json;
BEGIN
  -- Reuse existing RPCs to avoid duplicating logic.
  SELECT notification_admin_email_queue_summary()       INTO v_queue_summary;
  SELECT notification_admin_list_email_queue(
    _status  := _queue_status,
    _limit   := _queue_limit,
    _offset  := _queue_offset
  )::json                                               INTO v_queue_list;
  SELECT notification_admin_email_worker_run_summary()  INTO v_worker_summary;
  SELECT notification_admin_list_email_worker_runs(
    _status  := _run_status,
    _limit   := _run_limit,
    _offset  := _run_offset
  )::json                                               INTO v_worker_runs;
  SELECT notification_admin_email_dead_letter_analytics(
    _window_hours := _dl_window_hours,
    _limit        := _dl_limit
  )                                                     INTO v_dead_letter;

  RETURN json_build_object(
    'queue_summary',   v_queue_summary,
    'queue_list',      v_queue_list,
    'worker_summary',  v_worker_summary,
    'worker_runs',     v_worker_runs,
    'dead_letter',     v_dead_letter
  );
END;
$$;

GRANT EXECUTE ON FUNCTION notification_admin_combined_dashboard TO authenticated;
