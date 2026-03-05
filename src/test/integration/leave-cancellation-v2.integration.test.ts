import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { cleanupClients, createAnonClient, getTestUser, offsetDate } from './helpers/supabase-test-client';

type RpcErrorLike = {
  message?: string;
  code?: string;
};

type RpcResult<T> = {
  data: T | null;
  error: RpcErrorLike | null;
};

type UntypedRpcClient = {
  rpc: <T = unknown>(fn: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

type CancellationDecisionPayload = {
  request_id?: string;
  status?: string;
  cancellation_status?: string;
  workflow_stage?: string;
  resolved?: boolean;
};

const toRpcClient = (client: SupabaseClient<Database>): UntypedRpcClient =>
  client as unknown as UntypedRpcClient;

const LEAVE_OPS_IDENTIFIER = process.env.INTEGRATION_LEAVE_OPS_IDENTIFIER?.trim();
const LEAVE_OPS_PASSWORD = process.env.INTEGRATION_LEAVE_OPS_PASSWORD?.trim();

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

describe('Leave Cancellation Governance V2 Integration', () => {
  let adminClient: SupabaseClient<Database> | null = null;
  let employeeClient: SupabaseClient<Database>;
  let managerClient: SupabaseClient<Database>;
  let directorClient: SupabaseClient<Database>;

  let employeeId: string;
  let managerId: string;
  let directorId: string;
  let leaveTypeId: string;
  let setupReady = false;
  let setupIssue: string | null = null;

  const createdLeaveIds: string[] = [];

  beforeAll(async () => {
    if (LEAVE_OPS_IDENTIFIER && LEAVE_OPS_PASSWORD) {
      const admin = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER, LEAVE_OPS_PASSWORD);
      adminClient = admin.client;
    } else {
      setupIssue = 'Missing INTEGRATION_LEAVE_OPS_IDENTIFIER/INTEGRATION_LEAVE_OPS_PASSWORD for privileged setup.';
      setupReady = false;
    }

    const employee = await getTestUser('leave-cancel-v2-employee');
    employeeClient = employee.client;
    employeeId = employee.userId;

    const manager = await getTestUser('leave-cancel-v2-manager');
    managerClient = manager.client;
    managerId = manager.userId;

    const director = await getTestUser('leave-cancel-v2-director');
    directorClient = director.client;
    directorId = director.userId;

    const ensureUserRole = async (userId: string, role: 'manager' | 'director') => {
      const { data: existingRows, error: existingRowsError } = await adminClient
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
      if (existingRowsError) throw existingRowsError;

      if (!existingRows || existingRows.length === 0) {
        const { error: insertRoleError } = await adminClient
          .from('user_roles')
          .insert({ user_id: userId, role });
        if (insertRoleError) throw insertRoleError;
      } else {
        const { error: updateRoleError } = await adminClient
          .from('user_roles')
          .update({ role })
          .eq('id', existingRows[0].id);
        if (updateRoleError) throw updateRoleError;
      }

      const { data: verifyRows, error: verifyError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (verifyError) throw verifyError;
      if (!(verifyRows ?? []).some((row) => row.role === role)) {
        throw new Error(`Role bootstrap failed for ${role}`);
      }
    };

    if (adminClient) {
      try {
        await ensureUserRole(managerId, 'manager');
        await ensureUserRole(directorId, 'director');

        const { error: managerLinkError } = await adminClient
          .from('profiles')
          .update({ manager_id: managerId })
          .eq('id', employeeId);
        if (managerLinkError) throw managerLinkError;

        setupReady = true;
      } catch (error) {
        setupIssue = (error as Error).message;
        setupReady = false;
      }
    }

    const { data: leaveType, error: leaveTypeError } = await employeeClient
      .from('leave_types')
      .select('id')
      .limit(1)
      .single();

    expect(leaveTypeError).toBeNull();
    expect(leaveType?.id).toBeTruthy();
    leaveTypeId = leaveType!.id;
  }, 60_000);

  afterAll(async () => {
    if (adminClient && createdLeaveIds.length > 0) {
      await adminClient
        .from('leave_request_decisions')
        .delete()
        .in('leave_request_id', createdLeaveIds);
      await adminClient
        .from('leave_request_events')
        .delete()
        .in('leave_request_id', createdLeaveIds);
      await adminClient
        .from('leave_requests')
        .delete()
        .in('id', createdLeaveIds);
    }

    if (adminClient && managerId) {
      await adminClient.from('user_roles').update({ role: 'employee' }).eq('user_id', managerId);
    }
    if (adminClient && directorId) {
      await adminClient.from('user_roles').update({ role: 'employee' }).eq('user_id', directorId);
    }
    if (adminClient && employeeId) {
      await adminClient.from('profiles').update({ manager_id: null }).eq('id', employeeId);
    }

    await cleanupClients();
  });

  async function createFinalApprovedLeave() {
    const dayOffset = 32 + (createdLeaveIds.length * 3);

    const { data: inserted, error: insertError } = await employeeClient
      .from('leave_requests')
      .insert({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        start_date: offsetDate(dayOffset),
        end_date: offsetDate(dayOffset),
        days_count: 1,
        reason: 'Cancellation governance v2 integration',
        approval_route_snapshot: ['manager'],
      })
      .select('id, status, final_approved_at')
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.id).toBeTruthy();
    createdLeaveIds.push(inserted!.id);

    const { data: approved, error: approveError } = await toRpcClient(managerClient).rpc<{
      id?: string;
      status?: string;
      final_approved_at?: string | null;
    }>('approve_leave_request', {
      _request_id: inserted!.id,
      _action: 'approve',
      _manager_comments: 'Final approve for cancellation test',
    });

    expect(approveError).toBeNull();
    expect(approved?.status).toBe('manager_approved');
    expect(approved?.final_approved_at).toBeTruthy();

    return inserted!.id;
  }

  it('is callable and returns not-found for unknown request ids', async () => {
    const { client } = await getTestUser('leave-cancel-v2-unknown-request');

    const { error } = await toRpcClient(client).rpc<CancellationDecisionPayload>(
      'leave_decide_cancellation_request_v2',
      {
        _request_id: '00000000-0000-0000-0000-000000000000',
        _action: 'approve',
        _decision_reason: null,
        _comments: null,
        _expected_cancellation_status: 'pending',
      },
    );

    expect(error).toBeTruthy();
    expect(error?.code).toBe('P0002');
  });

  it('enforces stage checks and stale cancellation status deterministically', async () => {
    if (!setupReady) {
      console.warn(`[leave-cancel-v2] setup unavailable, skipping privileged flow: ${setupIssue ?? 'unknown error'}`);
      return;
    }

    const requestId = await createFinalApprovedLeave();

    const { data: cancelData, error: cancelError } = await toRpcClient(employeeClient).rpc<{
      result?: string;
      cancellation_status?: string;
    }>('leave_cancel_request_v2', {
      _request_id: requestId,
      _reason: 'Need to cancel due plan change',
      _comments: null,
    });

    expect(cancelError).toBeNull();
    expect(cancelData?.cancellation_status).toBe('pending');

    const stageMismatch = await toRpcClient(directorClient).rpc<CancellationDecisionPayload>(
      'leave_decide_cancellation_request_v2',
      {
        _request_id: requestId,
        _action: 'approve',
        _decision_reason: null,
        _comments: 'Trying to skip stage',
        _expected_cancellation_status: 'pending',
      },
    );

    expect(stageMismatch.error).toBeTruthy();
    expect(stageMismatch.error?.code).toBe('42501');
    expect(stageMismatch.error?.message).toMatch(/STAGE_MISMATCH/i);

    const managerApprove = await toRpcClient(managerClient).rpc<CancellationDecisionPayload>(
      'leave_decide_cancellation_request_v2',
      {
        _request_id: requestId,
        _action: 'approve',
        _decision_reason: null,
        _comments: 'Manager stage approved',
        _expected_cancellation_status: 'pending',
      },
    );

    expect(managerApprove.error).toBeNull();
    expect(managerApprove.data?.request_id).toBe(requestId);
    expect(['manager_approved', 'approved']).toContain(managerApprove.data?.cancellation_status);
    expect(managerApprove.data?.workflow_stage).toBe('manager');
    if (managerApprove.data?.cancellation_status === 'approved') {
      expect(managerApprove.data?.resolved).toBe(true);
    } else {
      expect(managerApprove.data?.resolved).toBe(false);
    }

    const staleAttempt = await toRpcClient(managerClient).rpc<CancellationDecisionPayload>(
      'leave_decide_cancellation_request_v2',
      {
        _request_id: requestId,
        _action: 'approve',
        _decision_reason: null,
        _comments: 'Stale retry',
        _expected_cancellation_status: 'pending',
      },
    );

    expect(staleAttempt.error).toBeTruthy();
    expect(staleAttempt.error?.code).toBe('P0001');
    expect(staleAttempt.error?.message).toMatch(/STALE_CANCELLATION_STATUS|non-final-approved/i);
  });

  it('records cancellation rejection decisions in leave_request_decisions', async () => {
    if (!setupReady) {
      console.warn(`[leave-cancel-v2] setup unavailable, skipping privileged flow: ${setupIssue ?? 'unknown error'}`);
      return;
    }

    const requestId = await createFinalApprovedLeave();

    const { error: cancelError } = await toRpcClient(employeeClient).rpc<{
      result?: string;
      cancellation_status?: string;
    }>('leave_cancel_request_v2', {
      _request_id: requestId,
      _reason: 'Cancellation reject audit test',
      _comments: null,
    });
    expect(cancelError).toBeNull();

    const rejectResult = await toRpcClient(managerClient).rpc<CancellationDecisionPayload>(
      'leave_decide_cancellation_request_v2',
      {
        _request_id: requestId,
        _action: 'reject',
        _decision_reason: 'Coverage not available',
        _comments: 'Rejecting cancellation',
        _expected_cancellation_status: 'pending',
      },
    );

    expect(rejectResult.error).toBeNull();
    expect(rejectResult.data?.cancellation_status).toBe('rejected');
    expect(rejectResult.data?.status).toBe('manager_approved');
    expect(rejectResult.data?.resolved).toBe(true);

    const { data: decisionRows, error: decisionError } = await managerClient
      .from('leave_request_decisions')
      .select('action, stage, metadata, to_cancellation_status')
      .eq('leave_request_id', requestId)
      .eq('action', 'cancel_reject')
      .order('decided_at', { ascending: false })
      .limit(1);

    expect(decisionError).toBeNull();
    expect(Array.isArray(decisionRows)).toBe(true);
    expect(decisionRows?.length).toBeGreaterThan(0);
    expect(decisionRows?.[0].stage).toBe('manager');
    expect(decisionRows?.[0].to_cancellation_status).toBe('rejected');
    expect((decisionRows?.[0].metadata as { decided_via?: string } | null)?.decided_via).toBe(
      'leave_decide_cancellation_request_v2',
    );
  });
});
