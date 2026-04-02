-- Governance hardening for announcements:
-- 1) Remove direct client-side mutation policy on announcements.
-- 2) Introduce append-only audit log for announcement changes.
-- 3) Route create/update/delete through capability-gated RPCs that require a reason.

DROP POLICY IF EXISTS "HR can manage announcements" ON public.announcements;

CREATE TABLE IF NOT EXISTS public.announcement_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  reason text NOT NULL CHECK (char_length(trim(reason)) >= 5),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  changed_by_role public.app_role,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcement_audit_log_announcement_changed_at
  ON public.announcement_audit_log (announcement_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcement_audit_log_changed_by_changed_at
  ON public.announcement_audit_log (changed_by, changed_at DESC);

ALTER TABLE public.announcement_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcement_audit_log_select_privileged ON public.announcement_audit_log;
CREATE POLICY announcement_audit_log_select_privileged
ON public.announcement_audit_log
FOR SELECT
TO authenticated
USING (
  public.admin_has_capability(
    (select public.request_user_id()),
    'view_admin_audit_log'::public.admin_capability
  )
);

REVOKE ALL ON public.announcement_audit_log FROM PUBLIC, anon;
GRANT SELECT ON public.announcement_audit_log TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_create_announcement(text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.admin_create_announcement(
  _title text,
  _content text,
  _priority text DEFAULT 'normal',
  _expires_at text DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS public.announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_row public.announcements%ROWTYPE;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_announcements'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_announcements capability is required'
      USING ERRCODE = '42501';
  END IF;

  IF pg_catalog.btrim(coalesce(_title, '')) = '' THEN
    RAISE EXCEPTION 'Announcement title is required'
      USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.btrim(coalesce(_content, '')) = '' THEN
    RAISE EXCEPTION 'Announcement content is required'
      USING ERRCODE = '22023';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  requester_role := public.get_user_role(requester_id);

  INSERT INTO public.announcements (
    title,
    content,
    priority,
    published_by,
    published_at,
    expires_at,
    is_active
  )
  VALUES (
    pg_catalog.btrim(_title),
    pg_catalog.btrim(_content),
    COALESCE(NULLIF(pg_catalog.btrim(_priority), ''), 'normal'),
    requester_id,
    now(),
    CASE
      WHEN NULLIF(pg_catalog.btrim(_expires_at), '') IS NULL THEN NULL
      ELSE (_expires_at)::timestamptz
    END,
    true
  )
  RETURNING * INTO v_row;

  INSERT INTO public.announcement_audit_log (
    announcement_id,
    action,
    reason,
    old_values,
    new_values,
    changed_by,
    changed_by_role
  )
  VALUES (
    v_row.id,
    'create',
    v_reason,
    NULL,
    to_jsonb(v_row),
    requester_id,
    requester_role
  );

  RETURN v_row;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_update_announcement(uuid, text, text, text, text, text);
CREATE OR REPLACE FUNCTION public.admin_update_announcement(
  _announcement_id uuid,
  _title text DEFAULT NULL,
  _content text DEFAULT NULL,
  _priority text DEFAULT NULL,
  _expires_at text DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS public.announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.announcements%ROWTYPE;
  v_updated public.announcements%ROWTYPE;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_announcements'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_announcements capability is required'
      USING ERRCODE = '42501';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.announcements
  WHERE id = _announcement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found'
      USING ERRCODE = 'P0002';
  END IF;

  requester_role := public.get_user_role(requester_id);

  UPDATE public.announcements
  SET title = COALESCE(NULLIF(pg_catalog.btrim(_title), ''), v_existing.title),
      content = COALESCE(NULLIF(pg_catalog.btrim(_content), ''), v_existing.content),
      priority = COALESCE(NULLIF(pg_catalog.btrim(_priority), ''), v_existing.priority),
      expires_at = CASE
        WHEN _expires_at IS NULL THEN v_existing.expires_at
        WHEN NULLIF(pg_catalog.btrim(_expires_at), '') IS NULL THEN NULL
        ELSE (_expires_at)::timestamptz
      END
  WHERE id = _announcement_id
  RETURNING * INTO v_updated;

  INSERT INTO public.announcement_audit_log (
    announcement_id,
    action,
    reason,
    old_values,
    new_values,
    changed_by,
    changed_by_role
  )
  VALUES (
    v_updated.id,
    'update',
    v_reason,
    to_jsonb(v_existing),
    to_jsonb(v_updated),
    requester_id,
    requester_role
  );

  RETURN v_updated;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_delete_announcement(uuid, text);
CREATE OR REPLACE FUNCTION public.admin_delete_announcement(
  _announcement_id uuid,
  _reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions'
AS $$
DECLARE
  requester_id uuid;
  requester_role public.app_role;
  v_reason text;
  v_existing public.announcements%ROWTYPE;
BEGIN
  requester_id := auth.uid();

  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '28000';
  END IF;

  IF NOT public.admin_has_capability(requester_id, 'manage_announcements'::public.admin_capability) THEN
    RAISE EXCEPTION 'Insufficient privileges: manage_announcements capability is required'
      USING ERRCODE = '42501';
  END IF;

  v_reason := NULLIF(pg_catalog.btrim(_reason), '');
  IF v_reason IS NULL OR pg_catalog.char_length(v_reason) < 5 THEN
    RAISE EXCEPTION 'A governance reason with at least 5 characters is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.announcements
  WHERE id = _announcement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Announcement not found'
      USING ERRCODE = 'P0002';
  END IF;

  requester_role := public.get_user_role(requester_id);

  DELETE FROM public.announcements
  WHERE id = _announcement_id;

  INSERT INTO public.announcement_audit_log (
    announcement_id,
    action,
    reason,
    old_values,
    new_values,
    changed_by,
    changed_by_role
  )
  VALUES (
    v_existing.id,
    'delete',
    v_reason,
    to_jsonb(v_existing),
    NULL,
    requester_id,
    requester_role
  );

  RETURN v_existing.id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_announcement(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_announcement(text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_update_announcement(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_announcement(uuid, text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_delete_announcement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_announcement(uuid, text) TO authenticated, service_role;
