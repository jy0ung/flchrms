import { afterAll, describe, expect, it } from 'vitest';
import { createAnonClient, cleanupClients, getTestUser, offsetDate } from './helpers/supabase-test-client';

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

describe('Leave Delegated Approval Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('employee without active delegation cannot approve manager-stage request', async () => {
    const requester = await getTestUser('leave-delegated-approval-requester');
    const outsider = await getTestUser('leave-delegated-approval-outsider');

    const { data: leaveType, error: leaveTypeError } = await requester.client
      .from('leave_types')
      .select('id')
      .limit(1)
      .single();
    expect(leaveTypeError).toBeNull();
    expect(leaveType?.id).toBeTruthy();

    const startDate = offsetDate(35);
    const { data: request, error: createError } = await requester.client
      .from('leave_requests')
      .insert({
        employee_id: requester.userId,
        leave_type_id: leaveType!.id,
        start_date: startDate,
        end_date: startDate,
        days_count: 1,
        reason: 'delegated-approval unauthorized check',
        approval_route_snapshot: ['manager'],
      })
      .select('id')
      .single();
    expect(createError).toBeNull();
    expect(request?.id).toBeTruthy();

    try {
      const { error: approveError } = await outsider.client.rpc('approve_leave_request', {
        _request_id: request!.id,
        _action: 'approve',
        _manager_comments: 'unauthorized delegated approval attempt',
      });
      expect(approveError).toBeTruthy();
    } finally {
      if (request?.id) {
        await requester.client
          .from('leave_request_events')
          .delete()
          .eq('leave_request_id', request.id);
        await requester.client
          .from('leave_requests')
          .delete()
          .eq('id', request.id);
      }
    }
  });

  const maybeIt = RUN_PRIVILEGED_FLOW ? it : it.skip;
  maybeIt(
    'delegate can approve manager-stage request when active approval delegation exists',
    async () => {
      const tag = `AUDIT_2026-03-05_PHASE2_DELEGATED_APPROVAL_${Date.now()}`;

      const privileged = await signInWithIdentifier(LEAVE_OPS_IDENTIFIER!, LEAVE_OPS_PASSWORD!);
      const requester = await getTestUser(`leave-delegated-approval-req-${Date.now()}`);
      const delegator = await getTestUser(`leave-delegated-approval-delegator-${Date.now()}`);
      const delegate = await getTestUser(`leave-delegated-approval-delegate-${Date.now()}`);

      let requestId: string | null = null;
      let delegationId: string | null = null;

      try {
        const { error: requesterRoleError } = await privileged.client
          .from('user_roles')
          .update({ role: 'employee' })
          .eq('user_id', requester.userId);
        expect(requesterRoleError).toBeNull();

        const { error: delegatorRoleError } = await privileged.client
          .from('user_roles')
          .update({ role: 'manager' })
          .eq('user_id', delegator.userId);
        expect(delegatorRoleError).toBeNull();

        const { error: delegateRoleError } = await privileged.client
          .from('user_roles')
          .update({ role: 'employee' })
          .eq('user_id', delegate.userId);
        expect(delegateRoleError).toBeNull();

        const { data: leaveType, error: leaveTypeError } = await requester.client
          .from('leave_types')
          .select('id')
          .limit(1)
          .single();
        expect(leaveTypeError).toBeNull();
        expect(leaveType?.id).toBeTruthy();

        const day = offsetDate(40);
        const { data: createdRequest, error: createError } = await requester.client
          .from('leave_requests')
          .insert({
            employee_id: requester.userId,
            leave_type_id: leaveType!.id,
            start_date: day,
            end_date: day,
            days_count: 1,
            reason: tag,
            approval_route_snapshot: ['manager'],
          })
          .select('id')
          .single();
        expect(createError).toBeNull();
        expect(createdRequest?.id).toBeTruthy();
        requestId = createdRequest!.id;

        const validFrom = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const validTo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const { data: createdDelegation, error: delegationError } = await delegator.client
          .from('leave_delegations')
          .insert({
            delegator_user_id: delegator.userId,
            delegate_user_id: delegate.userId,
            scope: 'leave_approval',
            valid_from: validFrom,
            valid_to: validTo,
            reason: tag,
            status: 'active',
          })
          .select('id')
          .single();
        expect(delegationError).toBeNull();
        expect(createdDelegation?.id).toBeTruthy();
        delegationId = createdDelegation!.id;

        const { data: visibleToDelegate, error: visibleError } = await delegate.client
          .from('leave_requests')
          .select('id,status')
          .eq('id', requestId)
          .single();
        expect(visibleError).toBeNull();
        expect(visibleToDelegate?.id).toBe(requestId);

        const { data: approvalData, error: approvalError } = await delegate.client.rpc('leave_decide_request', {
          _request_id: requestId,
          _action: 'approve',
          _decision_reason: null,
          _comments: `delegated manager approval ${tag}`,
          _expected_status: 'pending',
        });
        expect(approvalError).toBeNull();

        const approvalPayload = (approvalData ?? {}) as {
          status?: string;
          manager_approved_by?: string;
          final_approved_by?: string;
          final_approved_by_role?: string;
        };
        expect(approvalPayload.status).toBe('manager_approved');
        expect(approvalPayload.manager_approved_by).toBe(delegate.userId);
        expect(approvalPayload.final_approved_by).toBe(delegate.userId);
        expect(approvalPayload.final_approved_by_role).toBe('manager');
      } finally {
        if (delegationId) {
          await delegator.client
            .from('leave_delegations')
            .delete()
            .eq('id', delegationId);
        }

        if (requestId) {
          await privileged.client
            .from('leave_request_events')
            .delete()
            .eq('leave_request_id', requestId);
          await privileged.client
            .from('leave_requests')
            .delete()
            .eq('id', requestId);
        }

        await privileged.client
          .from('user_roles')
          .update({ role: 'employee' })
          .in('user_id', [delegator.userId, delegate.userId]);
      }
    },
    40_000,
  );
});
