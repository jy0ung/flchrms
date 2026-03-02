-- First-User Admin Promotion
-- Modifies the handle_new_user() trigger to automatically assign the 'admin'
-- role to the very first user who signs up on a fresh deployment.
-- All subsequent users receive the default 'employee' role as before.
--
-- Design rationale:
--   - The trigger fires AFTER INSERT ON auth.users, so NEW.id already exists.
--   - If auth.users contains exactly 1 non-deleted row, that row is the first
--     user and receives admin privileges.
--   - The count-based guard is inherently one-shot: once any user exists,
--     all future signups get 'employee'.
--   - Profile creation is completely unchanged.
--   - The admin_create_employee RPC also fires this trigger, but always runs
--     when an admin/HR user exists, so count > 1 → correctly assigns 'employee'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_role app_role := 'employee';
  user_count   int;
BEGIN
  -- Create profile (unchanged)
  INSERT INTO public.profiles (id, email, first_name, last_name, employee_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'EMP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(NEW.id::text, 1, 4)
  );

  -- First-user detection: promote to admin if this is the only user
  SELECT count(*) INTO user_count
  FROM auth.users
  WHERE deleted_at IS NULL;

  IF user_count = 1 THEN
    default_role := 'admin';
  END IF;

  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, default_role);

  RETURN NEW;
END;
$$;
