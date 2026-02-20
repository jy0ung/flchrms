-- Add username-based authentication support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT;

-- Normalize user-supplied usernames to a safe format
CREATE OR REPLACE FUNCTION public.normalize_username(_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(lower(coalesce(_value, '')), '[^a-z0-9._-]+', '', 'g'),
      '^[._-]+|[._-]+$',
      '',
      'g'
    ),
    ''
  );
$$;
REVOKE ALL ON FUNCTION public.normalize_username(TEXT) FROM PUBLIC;

-- Ensure each profile has a unique username
CREATE OR REPLACE FUNCTION public.generate_unique_username(_base TEXT, _profile_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_base TEXT;
  candidate TEXT;
  suffix INTEGER := 0;
BEGIN
  normalized_base := public.normalize_username(_base);

  IF normalized_base IS NULL THEN
    normalized_base := 'user';
  END IF;

  LOOP
    candidate := CASE
      WHEN suffix = 0 THEN normalized_base
      ELSE normalized_base || '_' || suffix::TEXT
    END;

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE lower(p.username) = lower(candidate)
        AND (_profile_id IS NULL OR p.id <> _profile_id)
    );

    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_unique_username(TEXT, UUID) FROM PUBLIC;

-- Auto-populate username on insert/update
CREATE OR REPLACE FUNCTION public.set_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
BEGIN
  base_username := coalesce(
    nullif(trim(NEW.username), ''),
    nullif(trim(NEW.employee_id), ''),
    split_part(coalesce(NEW.email, ''), '@', 1),
    split_part(NEW.id::TEXT, '-', 1)
  );

  NEW.username := public.generate_unique_username(base_username, NEW.id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.set_profile_username() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_profiles_username ON public.profiles;
CREATE TRIGGER set_profiles_username
BEFORE INSERT OR UPDATE OF username, email, employee_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_username();

-- Backfill existing profiles
UPDATE public.profiles
SET username = coalesce(
  nullif(trim(username), ''),
  nullif(trim(employee_id), ''),
  split_part(email, '@', 1),
  split_part(id::TEXT, '-', 1)
);

ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
ON public.profiles (lower(username));

-- Resolve sign-in identifier (username/email/employee_id) to auth email for password login
CREATE OR REPLACE FUNCTION public.resolve_login_email(_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_identifier TEXT;
  resolved_email TEXT;
BEGIN
  normalized_identifier := lower(trim(coalesce(_identifier, '')));

  IF normalized_identifier = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.email
  INTO resolved_email
  FROM public.profiles p
  WHERE lower(p.username) = normalized_identifier
     OR lower(coalesce(p.employee_id, '')) = normalized_identifier
     OR lower(p.email) = normalized_identifier
  LIMIT 1;

  RETURN resolved_email;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;
