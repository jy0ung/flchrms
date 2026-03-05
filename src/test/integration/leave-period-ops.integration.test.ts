import { afterAll, describe, expect, it } from 'vitest';
import { createAnonClient, getTestUser, cleanupClients } from './helpers/supabase-test-client';

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

describe('Leave Period Operations Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('non-policy-admin cannot run close period or payroll export', async () => {
    const { client } = await getTestUser('leave-ops-unauthorized');

    const periodStart = '2099-01-01';
    const periodEnd = '2099-01-31';

    const { error: closeError } = await client.rpc('leave_close_period', {
      _period_start: periodStart,
      _period_end: periodEnd,
      _notes: 'leave-period-ops unauthorized test',
      _dry_run: true,
    });
    expect(closeError).toBeTruthy();

    const { error: exportError } = await client.rpc('leave_export_payroll_inputs', {
      _period_start: periodStart,
      _period_end: periodEnd,
      _dry_run: true,
    });
    expect(exportError).toBeTruthy();
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt(
    'policy-admin can run dry-run and write mode period ops with cleanup',
    async () => {
      const tag = `AUDIT_2026-03-05_PHASE2_PERIOD_OPS_${Date.now()}`;
      const periodStart = '2099-01-01';
      const periodEnd = '2099-01-31';

      const { client } = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);
      const exportIdsToDelete: string[] = [];

      try {
        const { data: dryCloseDataRaw, error: dryCloseError } = await client.rpc('leave_close_period', {
          _period_start: periodStart,
          _period_end: periodEnd,
          _notes: tag,
          _dry_run: true,
        });

        expect(dryCloseError).toBeNull();
        const dryCloseData = (dryCloseDataRaw ?? {}) as {
          dry_run?: boolean;
          planned_snapshot_rows?: number;
          snapshot_rows?: number;
          payroll_export_id?: string;
        };
        expect(dryCloseData.dry_run).toBe(true);
        expect(typeof dryCloseData.planned_snapshot_rows).toBe('number');
        expect(typeof dryCloseData.snapshot_rows).toBe('number');
        expect(dryCloseData.payroll_export_id ?? null).toBeNull();

        const { data: closeDataRaw, error: closeError } = await client.rpc('leave_close_period', {
          _period_start: periodStart,
          _period_end: periodEnd,
          _notes: tag,
          _dry_run: false,
        });

        expect(closeError).toBeNull();
        const closeData = (closeDataRaw ?? {}) as {
          dry_run?: boolean;
          planned_snapshot_rows?: number;
          payroll_export_id?: string;
          snapshot_rows?: number;
        };
        expect(closeData.dry_run).toBe(false);
        expect(typeof closeData.planned_snapshot_rows).toBe('number');
        expect(typeof closeData.snapshot_rows).toBe('number');
        expect(closeData.snapshot_rows).toBeGreaterThanOrEqual(0);
        expect(closeData.payroll_export_id).toBeTruthy();
        if (closeData.payroll_export_id) {
          exportIdsToDelete.push(closeData.payroll_export_id);
        }

        const { data: dryExportDataRaw, error: dryExportError } = await client.rpc('leave_export_payroll_inputs', {
          _period_start: periodStart,
          _period_end: periodEnd,
          _dry_run: true,
        });

        expect(dryExportError).toBeNull();
        const dryExportData = (dryExportDataRaw ?? {}) as {
          dry_run?: boolean;
          export_id?: string | null;
          employees?: number;
          payload?: unknown[];
        };
        expect(dryExportData.dry_run).toBe(true);
        expect(dryExportData.export_id ?? null).toBeNull();
        expect(typeof dryExportData.employees).toBe('number');
        expect(Array.isArray(dryExportData.payload)).toBe(true);

        const { data: exportDataRaw, error: exportError } = await client.rpc('leave_export_payroll_inputs', {
          _period_start: periodStart,
          _period_end: periodEnd,
          _dry_run: false,
        });

        expect(exportError).toBeNull();
        const exportData = (exportDataRaw ?? {}) as {
          dry_run?: boolean;
          export_id?: string;
          employees?: number;
          payload?: unknown[];
        };
        expect(exportData.dry_run).toBe(false);
        expect(exportData.export_id).toBeTruthy();
        expect(typeof exportData.employees).toBe('number');
        expect(Array.isArray(exportData.payload)).toBe(true);
        if (exportData.export_id) {
          exportIdsToDelete.push(exportData.export_id);
        }
      } finally {
        if (exportIdsToDelete.length > 0) {
          await client
            .from('leave_payroll_exports')
            .delete()
            .in('id', exportIdsToDelete);
        }

        await client
          .from('leave_balance_snapshots')
          .delete()
          .eq('as_of_date', periodEnd)
          .contains('metadata', { notes: tag });
      }
    },
    30_000,
  );
});
