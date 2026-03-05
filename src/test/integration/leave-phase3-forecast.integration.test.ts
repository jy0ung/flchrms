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

describe('Leave Phase 3 Forecast Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('non-policy-admin cannot generate liability snapshot or run forecast', async () => {
    const { client } = await getTestUser('leave-phase3-unauthorized');
    const asOf = '2099-01-31';

    const { error: snapshotError } = await client.rpc('leave_generate_liability_snapshot', {
      _as_of: asOf,
      _scope: { source: 'integration-unauthorized' },
      _dry_run: true,
      _run_tag: `LEAVE_PHASE3_UNAUTH_${Date.now()}`,
    });
    expect(snapshotError).toBeTruthy();

    const { error: forecastError } = await client.rpc('leave_run_forecast', {
      _as_of: asOf,
      _horizon_months: 3,
      _scope: { source: 'integration-unauthorized' },
      _dry_run: true,
      _run_tag: `LEAVE_PHASE3_UNAUTH_${Date.now()}`,
    });
    expect(forecastError).toBeTruthy();
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt(
    'policy-admin can execute dry-run liability snapshot and forecast',
    async () => {
      const tag = `AUDIT_2026-03-05_PHASE3_FORECAST_${Date.now()}`;
      const asOf = '2099-01-31';
      const { client } = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);

      const { data: snapshotRaw, error: snapshotError } = await client.rpc(
        'leave_generate_liability_snapshot',
        {
          _as_of: asOf,
          _scope: { run: tag },
          _dry_run: true,
          _run_tag: tag,
        },
      );
      expect(snapshotError).toBeNull();

      const snapshot = (snapshotRaw ?? {}) as {
        dry_run?: boolean;
        planned_rows?: number;
        written_rows?: number;
        total_days?: number;
        estimated_amount?: number;
      };
      expect(snapshot.dry_run).toBe(true);
      expect(typeof snapshot.planned_rows).toBe('number');
      expect(typeof snapshot.written_rows).toBe('number');
      expect(typeof snapshot.total_days).toBe('number');
      expect(typeof snapshot.estimated_amount).toBe('number');

      const { data: forecastRaw, error: forecastError } = await client.rpc('leave_run_forecast', {
        _as_of: asOf,
        _horizon_months: 3,
        _scope: { run: tag },
        _dry_run: true,
        _run_tag: tag,
      });
      expect(forecastError).toBeNull();

      const forecast = (forecastRaw ?? {}) as {
        dry_run?: boolean;
        forecast_run_id?: string | null;
        horizon_months?: number;
        planned_rows?: number;
        written_rows?: number;
        total_projected_days?: number;
        total_projected_amount?: number;
      };
      expect(forecast.dry_run).toBe(true);
      expect(forecast.forecast_run_id ?? null).toBeNull();
      expect(forecast.horizon_months).toBe(3);
      expect(typeof forecast.planned_rows).toBe('number');
      expect(typeof forecast.written_rows).toBe('number');
      expect(typeof forecast.total_projected_days).toBe('number');
      expect(typeof forecast.total_projected_amount).toBe('number');
    },
    30_000,
  );
});
