import { afterAll, describe, expect, it } from 'vitest';

import {
  cleanupClients,
  getAdminClient,
  getTestUser,
} from './helpers/supabase-test-client';

describe('Employee profile RBAC integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  it('manager can update phone and job title for a direct report only', async () => {
    const admin = await getAdminClient();
    const manager = await getTestUser('profile-rbac-manager');
    const report = await getTestUser('profile-rbac-report');

    const { error: promoteError } = await admin.client
      .from('user_roles')
      .update({ role: 'manager' })
      .eq('user_id', manager.userId);
    expect(promoteError).toBeNull();

    const { error: linkError } = await admin.client
      .from('profiles')
      .update({ manager_id: manager.userId })
      .eq('id', report.userId);
    expect(linkError).toBeNull();

    const { data: updatedProfile, error: updateError } = await manager.client
      .from('profiles')
      .update({
        phone: '+60112233445',
        job_title: 'Integration Managed Role',
      })
      .eq('id', report.userId)
      .select('id, phone, job_title')
      .single();

    expect(updateError).toBeNull();
    expect(updatedProfile?.id).toBe(report.userId);
    expect(updatedProfile?.phone).toBe('+60112233445');
    expect(updatedProfile?.job_title).toBe('Integration Managed Role');
  });

  it('manager cannot update restricted profile fields for a direct report', async () => {
    const admin = await getAdminClient();
    const manager = await getTestUser('profile-rbac-guard-manager');
    const report = await getTestUser('profile-rbac-guard-report');

    const { error: promoteError } = await admin.client
      .from('user_roles')
      .update({ role: 'manager' })
      .eq('user_id', manager.userId);
    expect(promoteError).toBeNull();

    const { error: linkError } = await admin.client
      .from('profiles')
      .update({ manager_id: manager.userId })
      .eq('id', report.userId);
    expect(linkError).toBeNull();

    const { error: updateError } = await manager.client
      .from('profiles')
      .update({ username: 'blocked-manager-edit' })
      .eq('id', report.userId)
      .select('id, username')
      .single();

    expect(updateError).toBeTruthy();
    expect(updateError?.code).toBe('42501');

    const { data: persistedProfile, error: persistedError } = await admin.client
      .from('profiles')
      .select('username')
      .eq('id', report.userId)
      .single();

    expect(persistedError).toBeNull();
    expect(persistedProfile?.username).not.toBe('blocked-manager-edit');
  });
});
