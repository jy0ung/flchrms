-- Normalize PUBLIC RLS policies to authenticated for HRMS application tables
-- and re-merge permissive policies to eliminate Supabase advisor overlap warnings.
DO $$
DECLARE
  t RECORD;
  g RECORD;
  roles_sql TEXT;
  using_expr TEXT;
  check_expr TEXT;
  policy_name TEXT;
BEGIN
  CREATE TEMP TABLE tmp_policy_expanded (
    tablename TEXT NOT NULL,
    policyname TEXT NOT NULL,
    roles TEXT[] NOT NULL,
    action TEXT NOT NULL,
    qual TEXT NULL,
    with_check TEXT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_policy_expanded (tablename, policyname, roles, action, qual, with_check)
  SELECT
    p.tablename,
    p.policyname,
    ARRAY(
      SELECT DISTINCT CASE
        WHEN role_name = 'public' THEN 'authenticated'
        ELSE role_name
      END
      FROM unnest(p.roles::TEXT[]) AS role_name
      ORDER BY 1
    ) AS normalized_roles,
    action_map.action,
    p.qual,
    p.with_check
  FROM pg_policies p
  CROSS JOIN LATERAL unnest(
    CASE
      WHEN p.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']::TEXT[]
      ELSE ARRAY[p.cmd]::TEXT[]
    END
  ) AS action_map(action)
  WHERE p.schemaname = 'public'
    AND p.permissive = 'PERMISSIVE'
    AND p.tablename IN ('attendance', 'leave_requests', 'leave_types', 'profiles', 'user_roles');

  -- Snapshot complete; drop existing permissive policies for the target tables.
  FOR t IN
    SELECT DISTINCT tablename, policyname
    FROM tmp_policy_expanded
    ORDER BY tablename, policyname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t.policyname, t.tablename);
  END LOOP;

  -- Recreate merged, action-specific policies with normalized roles.
  FOR g IN
    SELECT tablename, roles, action
    FROM tmp_policy_expanded
    GROUP BY tablename, roles, action
    ORDER BY tablename, action
  LOOP
    roles_sql := array_to_string(
      ARRAY(
        SELECT CASE
          WHEN r = 'public' THEN 'PUBLIC'
          ELSE quote_ident(r)
        END
        FROM unnest(g.roles) AS r
      ),
      ', '
    );

    using_expr := NULL;
    check_expr := NULL;

    IF g.action IN ('SELECT', 'DELETE', 'UPDATE') THEN
      SELECT string_agg(format('(%s)', coalesce(nullif(e.qual, ''), 'true')), ' OR ' ORDER BY e.policyname)
      INTO using_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    IF g.action IN ('INSERT', 'UPDATE') THEN
      SELECT string_agg(
        format('(%s)', coalesce(nullif(e.with_check, ''), nullif(e.qual, ''), 'true')),
        ' OR '
        ORDER BY e.policyname
      )
      INTO check_expr
      FROM tmp_policy_expanded e
      WHERE e.tablename = g.tablename
        AND e.roles = g.roles
        AND e.action = g.action;
    END IF;

    policy_name := left(
      format(
        'merged_%s_%s_%s',
        g.tablename,
        lower(g.action),
        substr(md5(g.tablename || '|' || array_to_string(g.roles, ',') || '|' || g.action), 1, 8)
      ),
      63
    );

    IF g.action = 'SELECT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR SELECT TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'DELETE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR DELETE TO %s USING (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true')
      );
    ELSIF g.action = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR INSERT TO %s WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(check_expr, 'true')
      );
    ELSIF g.action = 'UPDATE' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR UPDATE TO %s USING (%s) WITH CHECK (%s)',
        policy_name,
        g.tablename,
        roles_sql,
        coalesce(using_expr, 'true'),
        coalesce(check_expr, coalesce(using_expr, 'true'))
      );
    END IF;
  END LOOP;
END;
$$;
