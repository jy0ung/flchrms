import { afterAll, describe, expect, it } from 'vitest';
import { cleanupClients, getTestUser } from './helpers/supabase-test-client';

describe('Leave Delegations Integration', () => {
  const createdDelegationIds: string[] = [];

  afterAll(async () => {
    const { client } = await getTestUser('leave-delegator-main');
    for (const delegationId of createdDelegationIds) {
      await client.from('leave_delegations').delete().eq('id', delegationId);
    }
    await cleanupClients();
  });

  it('delegator can create, revoke, and remove a delegation while delegate can view it', async () => {
    const { client: delegatorClient, userId: delegatorId } = await getTestUser('leave-delegator-main');
    const { client: delegateClient, userId: delegateId } = await getTestUser('leave-delegate-main');

    const validFrom = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const validTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: created, error: createError } = await delegatorClient
      .from('leave_delegations')
      .insert({
        delegator_user_id: delegatorId,
        delegate_user_id: delegateId,
        scope: 'leave_approval',
        valid_from: validFrom,
        valid_to: validTo,
        status: 'active',
        reason: 'Phase2 delegation integration test',
      })
      .select('id,delegator_user_id,delegate_user_id,status')
      .single();

    expect(createError).toBeNull();
    expect(created).toBeTruthy();
    expect(created!.delegator_user_id).toBe(delegatorId);
    expect(created!.delegate_user_id).toBe(delegateId);
    expect(created!.status).toBe('active');

    const delegationId = created!.id;
    createdDelegationIds.push(delegationId);

    const { data: delegateVisibleRow, error: delegateVisibleError } = await delegateClient
      .from('leave_delegations')
      .select('id,delegator_user_id,delegate_user_id,status')
      .eq('id', delegationId)
      .single();

    expect(delegateVisibleError).toBeNull();
    expect(delegateVisibleRow).toBeTruthy();
    expect(delegateVisibleRow!.delegate_user_id).toBe(delegateId);

    const { data: revoked, error: revokeError } = await delegatorClient
      .from('leave_delegations')
      .update({ status: 'revoked' })
      .eq('id', delegationId)
      .select('id,status')
      .single();

    expect(revokeError).toBeNull();
    expect(revoked).toBeTruthy();
    expect(revoked!.status).toBe('revoked');

    const { error: deleteError } = await delegatorClient
      .from('leave_delegations')
      .delete()
      .eq('id', delegationId);

    expect(deleteError).toBeNull();
  });
});
