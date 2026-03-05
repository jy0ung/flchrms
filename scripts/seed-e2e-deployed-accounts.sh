#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

DO_SEED=1
DO_VERIFY=1
AUDIT_RUN_ID="${AUDIT_RUN_ID:-AUDIT_$(date -u +%Y-%m-%d)}"

usage() {
  cat <<'EOF'
Usage: bash scripts/seed-e2e-deployed-accounts.sh [--seed-only | --verify-only]

Deterministically seeds and verifies the six RBAC E2E accounts in a deployed Supabase project.
Runs through Supabase Management API SQL endpoint; no local DB required.

Required env:
  SUPABASE_PROJECT_REF
  SUPABASE_MANAGEMENT_TOKEN
  E2E_ADMIN_IDENTIFIER / E2E_ADMIN_PASSWORD
  E2E_HR_IDENTIFIER / E2E_HR_PASSWORD
  E2E_DIRECTOR_IDENTIFIER / E2E_DIRECTOR_PASSWORD
  E2E_GENERAL_MANAGER_IDENTIFIER / E2E_GENERAL_MANAGER_PASSWORD
  E2E_MANAGER_IDENTIFIER / E2E_MANAGER_PASSWORD
  E2E_EMPLOYEE_IDENTIFIER / E2E_EMPLOYEE_PASSWORD

If an identifier is not an email, also provide:
  E2E_<ROLE>_EMAIL

Optional env:
  E2E_<ROLE>_LOGIN_FIELD=email|username|employee_id
  AUDIT_RUN_ID (default: AUDIT_YYYY-MM-DD, UTC)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --seed-only)
      DO_VERIFY=0
      shift
      ;;
    --verify-only)
      DO_SEED=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v curl >/dev/null 2>&1; then
  echo "'curl' is required." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "'node' is required." >&2
  exit 1
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "SUPABASE_PROJECT_REF is required." >&2
  exit 1
fi

if [[ -z "${SUPABASE_MANAGEMENT_TOKEN:-}" ]]; then
  echo "SUPABASE_MANAGEMENT_TOKEN is required." >&2
  exit 1
fi

sql_escape() {
  printf "%s" "$1" | sed "s/'/''/g"
}

sql_quote() {
  printf "'%s'" "$(sql_escape "$1")"
}

post_sql_query() {
  local query="$1"
  local response_file http_code payload

  response_file="$(mktemp)"
  payload="$(node -e 'const fs=require("fs"); const q=fs.readFileSync(0,"utf8"); process.stdout.write(JSON.stringify({query:q}));' <<<"${query}")"

  http_code="$(
    curl -sS -o "${response_file}" -w "%{http_code}" \
      -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query" \
      -H "Authorization: Bearer ${SUPABASE_MANAGEMENT_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "${payload}"
  )"

  if [[ "${http_code}" -lt 200 || "${http_code}" -ge 300 ]]; then
    echo "Supabase Management API query failed (HTTP ${http_code})." >&2
    cat "${response_file}" >&2
    rm -f "${response_file}"
    return 1
  fi

  if ! node -e '
const fs = require("fs");
const body = fs.readFileSync(process.argv[1], "utf8");
try {
  const parsed = JSON.parse(body);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && (parsed.error || parsed.code || parsed.message)) {
    console.error(body);
    process.exit(2);
  }
} catch {
  // Non-JSON body; let caller inspect output.
}
' "${response_file}"; then
    echo "Supabase SQL execution returned an error payload." >&2
    rm -f "${response_file}"
    return 1
  fi

  cat "${response_file}"
  rm -f "${response_file}"
}

declare -a ROLE_KEYS=(
  "ADMIN"
  "HR"
  "DIRECTOR"
  "GENERAL_MANAGER"
  "MANAGER"
  "EMPLOYEE"
)

declare -A ROLE_NAME=(
  ["ADMIN"]="admin"
  ["HR"]="hr"
  ["DIRECTOR"]="director"
  ["GENERAL_MANAGER"]="general_manager"
  ["MANAGER"]="manager"
  ["EMPLOYEE"]="employee"
)

declare -A ROLE_FIRST_NAME=(
  ["ADMIN"]="Audit"
  ["HR"]="Audit"
  ["DIRECTOR"]="Audit"
  ["GENERAL_MANAGER"]="Audit"
  ["MANAGER"]="Audit"
  ["EMPLOYEE"]="Audit"
)

declare -A ROLE_LAST_NAME=(
  ["ADMIN"]="Admin"
  ["HR"]="HR"
  ["DIRECTOR"]="Director"
  ["GENERAL_MANAGER"]="GeneralManager"
  ["MANAGER"]="Manager"
  ["EMPLOYEE"]="Employee"
)

declare -a rows_with_password=()
declare -a rows_without_password=()
declare -a config_errors=()

for role_key in "${ROLE_KEYS[@]}"; do
  identifier_var="E2E_${role_key}_IDENTIFIER"
  password_var="E2E_${role_key}_PASSWORD"
  email_var="E2E_${role_key}_EMAIL"
  login_field_var="E2E_${role_key}_LOGIN_FIELD"

  identifier="${!identifier_var:-}"
  password="${!password_var:-}"
  email="${!email_var:-}"
  login_field="${!login_field_var:-}"

  if [[ -z "${identifier}" ]]; then
    config_errors+=("${identifier_var} is required.")
    continue
  fi

  if [[ -z "${password}" ]]; then
    config_errors+=("${password_var} is required.")
    continue
  fi

  if [[ "${identifier}" == *"@"* ]]; then
    email="${identifier}"
    default_login_mode="email"
  else
    if [[ -z "${email}" ]]; then
      config_errors+=("${email_var} is required when ${identifier_var} is not an email.")
      continue
    fi
    if [[ "${identifier}" == *"-"* ]]; then
      default_login_mode="employee_id"
    else
      default_login_mode="username"
    fi
  fi

  if [[ "${email}" != *"@"* ]]; then
    config_errors+=("${email_var} (or ${identifier_var}) must be a valid email.")
    continue
  fi

  login_mode="${login_field:-${default_login_mode}}"
  case "${login_mode}" in
    email|username|employee_id)
      ;;
    *)
      config_errors+=("${login_field_var} must be one of: email, username, employee_id.")
      continue
      ;;
  esac

  db_role="${ROLE_NAME[${role_key}]}"
  first_name="${ROLE_FIRST_NAME[${role_key}]}"
  last_name="${ROLE_LAST_NAME[${role_key}]}"

  rows_with_password+=(
    "($(sql_quote "${db_role}"), $(sql_quote "${identifier}"), $(sql_quote "${email}"), $(sql_quote "${password}"), $(sql_quote "${first_name}"), $(sql_quote "${last_name}"), $(sql_quote "${login_mode}"), $(sql_quote "${AUDIT_RUN_ID}"))"
  )

  rows_without_password+=(
    "($(sql_quote "${db_role}"), $(sql_quote "${identifier}"), $(sql_quote "${email}"), $(sql_quote "${first_name}"), $(sql_quote "${last_name}"), $(sql_quote "${login_mode}"), $(sql_quote "${AUDIT_RUN_ID}"))"
  )
done

if [[ "${#config_errors[@]}" -gt 0 ]]; then
  echo "Configuration errors:" >&2
  for err in "${config_errors[@]}"; do
    echo "- ${err}" >&2
  done
  exit 1
fi

rows_with_password_sql=""
for row in "${rows_with_password[@]}"; do
  if [[ -n "${rows_with_password_sql}" ]]; then
    rows_with_password_sql+=$',\n'
  fi
  rows_with_password_sql+="      ${row}"
done

rows_without_password_sql=""
for row in "${rows_without_password[@]}"; do
  if [[ -n "${rows_without_password_sql}" ]]; then
    rows_without_password_sql+=$',\n'
  fi
  rows_without_password_sql+="      ${row}"
done

seed_sql="$(cat <<SQL
DO \$\$
DECLARE
  rec record;
  v_user_id uuid;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
${rows_with_password_sql}
    ) AS e(role, identifier, email, password, first_name, last_name, login_mode, audit_tag)
  LOOP
    SELECT u.id
      INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(rec.email)
      AND u.deleted_at IS NULL
    ORDER BY u.created_at ASC
    LIMIT 1;

    IF v_user_id IS NULL THEN
      v_user_id := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        invited_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user,
        is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        rec.email,
        extensions.crypt(rec.password, extensions.gen_salt('bf')),
        now(),
        NULL,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object(
          'sub', v_user_id::text,
          'email', rec.email,
          'first_name', rec.first_name,
          'last_name', rec.last_name,
          'email_verified', true,
          'phone_verified', false,
          'audit_tag', rec.audit_tag
        ),
        now(),
        now(),
        '',
        '',
        '',
        '',
        '',
        0,
        '',
        false,
        false
      );
    ELSE
      UPDATE auth.users
      SET
        email = rec.email,
        encrypted_password = extensions.crypt(rec.password, extensions.gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
          || jsonb_build_object(
            'sub', v_user_id::text,
            'email', rec.email,
            'first_name', rec.first_name,
            'last_name', rec.last_name,
            'email_verified', true,
            'phone_verified', false,
            'audit_tag', rec.audit_tag
          ),
        updated_at = now()
      WHERE id = v_user_id;
    END IF;

    UPDATE public.profiles
    SET
      email = rec.email,
      first_name = rec.first_name,
      last_name = rec.last_name
    WHERE id = v_user_id;

    IF rec.login_mode = 'username' THEN
      UPDATE public.profiles
      SET username = rec.identifier
      WHERE id = v_user_id;
    ELSIF rec.login_mode = 'employee_id' THEN
      UPDATE public.profiles
      SET employee_id = rec.identifier
      WHERE id = v_user_id;
    END IF;

    DELETE FROM public.user_roles
    WHERE user_id = v_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, rec.role::public.app_role);
  END LOOP;
END
\$\$;
SQL
)"

verify_sql="$(cat <<SQL
DO \$\$
DECLARE
  rec record;
  v_user_id uuid;
  v_role_rows integer;
  v_password_ok boolean;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
${rows_with_password_sql}
    ) AS e(role, identifier, email, password, first_name, last_name, login_mode, audit_tag)
  LOOP
    SELECT u.id
      INTO v_user_id
    FROM auth.users u
    WHERE lower(u.email) = lower(rec.email)
      AND u.deleted_at IS NULL
    ORDER BY u.created_at ASC
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Missing auth.users account for % (%).', rec.role, rec.email;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_user_id
    ) THEN
      RAISE EXCEPTION 'Missing profile row for % (%).', rec.role, rec.email;
    END IF;

    SELECT count(*)
      INTO v_role_rows
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id;

    IF v_role_rows <> 1 THEN
      RAISE EXCEPTION 'Expected exactly one role row for %, found %.', rec.email, v_role_rows;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.role = rec.role::public.app_role
    ) THEN
      RAISE EXCEPTION 'Role mismatch for % (expected %).', rec.email, rec.role;
    END IF;

    SELECT (u.encrypted_password = extensions.crypt(rec.password, u.encrypted_password))
      INTO v_password_ok
    FROM auth.users u
    WHERE u.id = v_user_id;

    IF coalesce(v_password_ok, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'Password check failed for %.', rec.email;
    END IF;

    IF rec.login_mode = 'username' AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_user_id
        AND lower(p.username) = lower(rec.identifier)
    ) THEN
      RAISE EXCEPTION 'Username identifier mismatch for % (expected %).', rec.email, rec.identifier;
    END IF;

    IF rec.login_mode = 'employee_id' AND NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_user_id
        AND lower(coalesce(p.employee_id, '')) = lower(rec.identifier)
    ) THEN
      RAISE EXCEPTION 'Employee ID identifier mismatch for % (expected %).', rec.email, rec.identifier;
    END IF;
  END LOOP;
END
\$\$;
SQL
)"

summary_sql="$(cat <<SQL
WITH expected AS (
  SELECT *
  FROM (VALUES
${rows_without_password_sql}
  ) AS e(role, identifier, email, first_name, last_name, login_mode, audit_tag)
)
SELECT
  e.role AS expected_role,
  e.identifier AS login_identifier,
  e.login_mode AS login_mode,
  u.email AS auth_email,
  p.username AS profile_username,
  p.employee_id AS profile_employee_id,
  ur.role::text AS assigned_role
FROM expected e
LEFT JOIN auth.users u
  ON lower(u.email) = lower(e.email)
 AND u.deleted_at IS NULL
LEFT JOIN public.profiles p
  ON p.id = u.id
LEFT JOIN public.user_roles ur
  ON ur.user_id = u.id
ORDER BY
  CASE e.role
    WHEN 'admin' THEN 1
    WHEN 'hr' THEN 2
    WHEN 'director' THEN 3
    WHEN 'general_manager' THEN 4
    WHEN 'manager' THEN 5
    ELSE 6
  END;
SQL
)"

if [[ "${DO_SEED}" -eq 1 ]]; then
  echo "Seeding RBAC E2E accounts for project ${SUPABASE_PROJECT_REF}..."
  post_sql_query "${seed_sql}" >/dev/null
  echo "Seed step completed."
fi

if [[ "${DO_VERIFY}" -eq 1 ]]; then
  echo "Verifying RBAC E2E accounts..."
  post_sql_query "${verify_sql}" >/dev/null
  echo "Verify step completed."
fi

echo "Audit tag: ${AUDIT_RUN_ID}"
echo "Account summary:"
summary_json="$(post_sql_query "${summary_sql}")"
echo "${summary_json}" | node -e '
const fs = require("fs");
const raw = fs.readFileSync(0, "utf8");
try {
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify(parsed, null, 2));
} catch {
  console.log(raw);
}
'

echo "Done."
