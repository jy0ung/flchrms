import { afterAll, describe, expect, it } from 'vitest';
import { cleanupClients, createAnonClient, getTestUser } from './helpers/supabase-test-client';

const LEAVE_OPS_IDENTIFIER = process.env.INTEGRATION_LEAVE_OPS_IDENTIFIER?.trim();
const LEAVE_OPS_PASSWORD = process.env.INTEGRATION_LEAVE_OPS_PASSWORD?.trim();
const ALLOW_MUTATIONS = process.env.INTEGRATION_ALLOW_MUTATIONS === '1';
const RUN_PRIVILEGED_FLOW = Boolean(LEAVE_OPS_IDENTIFIER && LEAVE_OPS_PASSWORD && ALLOW_MUTATIONS);

async function signInWithIdentifier(identifier: string, password: string) {
  const client = createAnonClient();

  let email = identifier;
  if (!identifier.includes('@')) {
    const { data: resolved, error: resolveError } = await client.rpc('resolve_login_email', {
      _identifier: identifier,
    });

    if (resolveError) {
      throw new Error(`Failed to resolve login identifier: ${resolveError.message}`);
    }

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

    if (!resolvedEmail) {
      throw new Error('Resolved login email is empty.');
    }
    email = resolvedEmail;
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(`Failed to authenticate privileged actor: ${error?.message ?? 'Unknown error'}`);
  }

  return { client, email, userId: data.user.id };
}

describe('Leave Phase 3 Simulation Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('non-policy-admin cannot run simulation RPCs', async () => {
    const { client } = await getTestUser('leave-phase3-sim-unauthorized');
    const asOf = '2099-01-31';

    const { error: policySimError } = await client.rpc('leave_simulate_policy_change', {
      _as_of: asOf,
      _horizon_months: 3,
      _scope: { source: 'integration-unauthorized' },
      _policy_changes: { accrual_multiplier: 1.1 },
    });
    expect(policySimError).toBeTruthy();

    const { error: accrualSimError } = await client.rpc('leave_simulate_accrual_scenario', {
      _as_of: asOf,
      _scope: { source: 'integration-unauthorized' },
      _scenario: { months: 6, accrual_multiplier: 1.05 },
    });
    expect(accrualSimError).toBeTruthy();
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt(
    'policy-admin can run read-only policy and accrual simulations',
    async () => {
      const asOf = '2099-01-31';
      const { client } = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);

      const { data: policySimRaw, error: policySimError } = await client.rpc(
        'leave_simulate_policy_change',
        {
          _as_of: asOf,
          _horizon_months: 3,
          _scope: { source: 'integration-sim' },
          _policy_changes: {
            accrual_multiplier: 1.1,
            consumption_multiplier: 0.95,
            carryover_cap_days: 40,
          },
        },
      );
      expect(policySimError).toBeNull();

      const policySim = (policySimRaw ?? {}) as {
        dry_run?: boolean;
        horizon_months?: number;
        monthly_delta?: unknown[];
        baseline_total_amount?: number;
        simulated_total_amount?: number;
      };
      expect(policySim.dry_run).toBe(true);
      expect(policySim.horizon_months).toBe(3);
      expect(Array.isArray(policySim.monthly_delta)).toBe(true);
      expect(policySim.monthly_delta?.length).toBe(3);
      expect(typeof policySim.baseline_total_amount).toBe('number');
      expect(typeof policySim.simulated_total_amount).toBe('number');

      const { data: accrualSimRaw, error: accrualSimError } = await client.rpc(
        'leave_simulate_accrual_scenario',
        {
          _as_of: asOf,
          _scope: { source: 'integration-sim' },
          _scenario: {
            months: 6,
            accrual_multiplier: 1.05,
          },
        },
      );
      expect(accrualSimError).toBeNull();

      const accrualSim = (accrualSimRaw ?? {}) as {
        dry_run?: boolean;
        scenario?: { months?: number };
        by_leave_type?: unknown[];
        baseline_total_units?: number;
        simulated_total_units?: number;
      };
      expect(accrualSim.dry_run).toBe(true);
      expect(accrualSim.scenario?.months).toBe(6);
      expect(Array.isArray(accrualSim.by_leave_type)).toBe(true);
      expect(typeof accrualSim.baseline_total_units).toBe('number');
      expect(typeof accrualSim.simulated_total_units).toBe('number');
    },
    30_000,
  );
});
