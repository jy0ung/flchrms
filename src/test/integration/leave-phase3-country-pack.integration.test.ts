import { afterAll, describe, expect, it } from 'vitest';
import { cleanupClients, createAnonClient, getTestUser } from './helpers/supabase-test-client';

const LEAVE_OPS_IDENTIFIER = process.env.INTEGRATION_LEAVE_OPS_IDENTIFIER?.trim();
const LEAVE_OPS_PASSWORD = process.env.INTEGRATION_LEAVE_OPS_PASSWORD?.trim();
const ALLOW_MUTATIONS = process.env.INTEGRATION_ALLOW_MUTATIONS === '1';
const RUN_PRIVILEGED_FLOW = Boolean(LEAVE_OPS_IDENTIFIER && LEAVE_OPS_PASSWORD && ALLOW_MUTATIONS);

function extractScalar(data: unknown): string | null {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    const first = data[0] as Record<string, unknown> | undefined;
    if (!first || typeof first !== 'object') return null;
    const val = first.leave_get_active_policy_version as unknown;
    return typeof val === 'string' ? val : null;
  }
  if (data && typeof data === 'object') {
    const maybe = (data as Record<string, unknown>).leave_get_active_policy_version;
    return typeof maybe === 'string' ? maybe : null;
  }
  return null;
}

async function signInWithIdentifier(identifier: string, password: string) {
  const client = createAnonClient();

  let email = identifier;
  if (!identifier.includes('@')) {
    const { data: resolved, error: resolveError } = await client.rpc('resolve_login_email', {
      _identifier: identifier,
    });
    if (resolveError) throw new Error(`Failed to resolve login identifier: ${resolveError.message}`);

    const payload = resolved as unknown;
    const resolvedEmail =
      typeof payload === 'string'
        ? payload
        : Array.isArray(payload)
          ? (
              payload[0] as
                | { email?: string | null; resolve_login_email?: string | null }
                | undefined
            )?.email ??
            (
              payload[0] as
                | { email?: string | null; resolve_login_email?: string | null }
                | undefined
            )?.resolve_login_email ??
            null
          : (payload as { email?: string | null; resolve_login_email?: string | null } | null)?.email ??
            (payload as { email?: string | null; resolve_login_email?: string | null } | null)
              ?.resolve_login_email ??
            null;

    if (!resolvedEmail) throw new Error('Resolved login email is empty.');
    email = resolvedEmail;
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Failed to authenticate privileged actor: ${error?.message ?? 'Unknown error'}`);
  }

  return { client };
}

describe('Leave Phase 3 Country Pack Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('requires authentication for country-pack context RPC', async () => {
    const client = createAnonClient();
    const { error } = await client.rpc('leave_get_country_pack_context', {
      _as_of: '2099-01-31',
      _country_code: 'MY',
    });
    expect(error).toBeTruthy();
  });

  it('returns MY default country-pack context for authenticated user', async () => {
    const { client } = await getTestUser('leave-phase3-country-pack-auth');
    const { data, error } = await client.rpc('leave_get_country_pack_context', {
      _as_of: '2099-01-31',
      _country_code: 'MY',
    });

    expect(error).toBeNull();
    const ctx = (data ?? {}) as {
      policy_set_id?: string;
      pack_code?: string;
      country_code?: string;
      resolved_by?: string;
    };

    expect(ctx.policy_set_id).toBeTruthy();
    expect(ctx.country_code).toBe('MY');
    expect(typeof ctx.pack_code).toBe('string');
    expect(typeof ctx.resolved_by).toBe('string');
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt(
    'keeps active policy resolution backward compatible with context resolver',
    async () => {
      const { client } = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);
      const asOf = '2099-01-31';

      const { data: defaultPolicyData, error: defaultPolicyError } = await client.rpc(
        'leave_get_active_policy_version',
        { _as_of: asOf },
      );
      expect(defaultPolicyError).toBeNull();

      const { data: scopedPolicyData, error: scopedPolicyError } = await client.rpc(
        'leave_get_active_policy_version_for_context',
        {
          _as_of: asOf,
          _legal_entity: null,
          _location_code: null,
          _country_code: 'MY',
        },
      );
      expect(scopedPolicyError).toBeNull();

      const defaultPolicyId = extractScalar(defaultPolicyData);
      const scopedPolicyId = extractScalar(scopedPolicyData);
      expect(defaultPolicyId).toBeTruthy();
      expect(scopedPolicyId).toBeTruthy();
      expect(scopedPolicyId).toBe(defaultPolicyId);
    },
    30_000,
  );
});
