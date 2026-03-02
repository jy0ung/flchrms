/**
 * Integration Tests — Leave Management
 *
 * All tests share 'leave-main'; only the RLS cross-user test uses 'leave-rls'.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
  offsetDate,
} from './helpers/supabase-test-client';

describe('Leave Management Integration', () => {
  const createdLeaveIds: string[] = [];

  afterAll(async () => {
    const { client, userId } = await getTestUser('leave-main');
    for (const id of createdLeaveIds) {
      await client.from('leave_requests').delete().eq('id', id).eq('employee_id', userId);
    }
    await cleanupClients();
  });

  // ── Leave Types ──────────────────────────────────────────────────────
  describe('leave_types', () => {
    it('returns available leave types', async () => {
      const { client } = await getTestUser('leave-main');
      const { data, error } = await client.from('leave_types').select('*');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it('leave type has required fields', async () => {
      const { client } = await getTestUser('leave-main');
      const { data } = await client
        .from('leave_types')
        .select('id, name, days_allowed, is_paid, requires_document')
        .limit(1)
        .single();
      expect(data!.id).toBeTruthy();
      expect(data!.name).toBeTruthy();
      expect(typeof data!.days_allowed).toBe('number');
      expect(typeof data!.is_paid).toBe('boolean');
    });
  });

  // ── Leave Request CRUD ───────────────────────────────────────────────
  describe('leave_requests', () => {
    it('employee can create a leave request', async () => {
      const { client, userId } = await getTestUser('leave-main');
      const { data: lt } = await client.from('leave_types').select('id').limit(1).single();

      const { data, error } = await client
        .from('leave_requests')
        .insert({
          employee_id: userId,
          leave_type_id: lt!.id,
          start_date: offsetDate(30),
          end_date: offsetDate(31),
          days_count: 2,
          reason: 'Integration test leave request',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data!.employee_id).toBe(userId);
      expect(data!.status).toBe('pending');
      expect(data!.days_count).toBe(2);
      createdLeaveIds.push(data!.id);
    });

    it('employee can read own leave requests', async () => {
      const { client, userId } = await getTestUser('leave-main');
      const { data, error } = await client
        .from('leave_requests')
        .select('id, employee_id, status')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(data!.every((lr) => lr.employee_id === userId)).toBe(true);
    });

    it('leave request has timestamps', async () => {
      const { client, userId } = await getTestUser('leave-main');
      const { data } = await client
        .from('leave_requests')
        .select('created_at, updated_at')
        .eq('employee_id', userId)
        .limit(1)
        .single();
      expect(data!.created_at).toBeTruthy();
      expect(data!.updated_at).toBeTruthy();
    });

    it('leave request joins to leave_types', async () => {
      const { client, userId } = await getTestUser('leave-main');
      const { data, error } = await client
        .from('leave_requests')
        .select('id, leave_types(name, days_allowed)')
        .eq('employee_id', userId)
        .limit(1)
        .single();
      expect(error).toBeNull();
      expect((data as any).leave_types).toBeTruthy();
      expect((data as any).leave_types.name).toBeTruthy();
    });

    it('employee cannot insert leave for another user', async () => {
      const { client } = await getTestUser('leave-rls');
      const { data: lt } = await client.from('leave_types').select('id').limit(1).single();
      const { error } = await client
        .from('leave_requests')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          leave_type_id: lt!.id,
          start_date: offsetDate(40),
          end_date: offsetDate(41),
          days_count: 2,
          reason: 'Should fail RLS',
        });
      expect(error).toBeTruthy();
    });
  });

  // ── Workflows ────────────────────────────────────────────────────────
  describe('workflows', () => {
    it('can read approval workflows', async () => {
      const { client } = await getTestUser('leave-main');
      const { data, error } = await client
        .from('leave_approval_workflows')
        .select('id, requester_role, approval_stages, is_active');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('can read cancellation workflows', async () => {
      const { client } = await getTestUser('leave-main');
      const { data, error } = await client
        .from('leave_cancellation_workflows')
        .select('id, requester_role, approval_stages, is_active');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
