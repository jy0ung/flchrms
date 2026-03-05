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

describe('Leave SLA Escalation Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('non-policy-admin cannot run SLA escalation writer', async () => {
    const { client } = await getTestUser('leave-sla-escalation-unauthorized');

    const { error } = await client.rpc('leave_run_sla_escalation', {
      _as_of: null,
      _dry_run: true,
      _max_rows: 50,
      _run_tag: 'UNAUTHORIZED_CHECK',
    });

    expect(error).toBeTruthy();
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt('policy-admin can run SLA escalation dry-run and write-run with cleanup', async () => {
    const runTag = `AUDIT_2026-03-05_SLA_ESC_${Date.now()}`;
    const { client } = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);

    try {
      const { data: dryRunDataRaw, error: dryRunError } = await client.rpc('leave_run_sla_escalation', {
        _as_of: null,
        _dry_run: true,
        _max_rows: 100,
        _run_tag: `${runTag}_DRY`,
      });

      expect(dryRunError).toBeNull();
      const dryRunData = (dryRunDataRaw ?? {}) as {
        dry_run?: boolean;
        scanned?: number;
        breached?: number;
        inserted?: number;
        skipped_existing?: number;
      };
      expect(dryRunData.dry_run).toBe(true);
      expect(typeof dryRunData.scanned).toBe('number');
      expect(typeof dryRunData.breached).toBe('number');
      expect(dryRunData.inserted).toBe(0);

      const { data: writeRunDataRaw, error: writeRunError } = await client.rpc('leave_run_sla_escalation', {
        _as_of: null,
        _dry_run: false,
        _max_rows: 100,
        _run_tag: runTag,
      });

      expect(writeRunError).toBeNull();
      const writeRunData = (writeRunDataRaw ?? {}) as {
        dry_run?: boolean;
        scanned?: number;
        breached?: number;
        inserted?: number;
        skipped_existing?: number;
      };
      expect(writeRunData.dry_run).toBe(false);
      expect(typeof writeRunData.scanned).toBe('number');
      expect(typeof writeRunData.breached).toBe('number');
      expect(typeof writeRunData.inserted).toBe('number');
      expect(typeof writeRunData.skipped_existing).toBe('number');
    } finally {
      await client
        .from('leave_request_decisions')
        .delete()
        .eq('action', 'override')
        .contains('metadata', {
          decided_via: 'leave_run_sla_escalation',
          run_tag: runTag,
        });
    }
  });
});
