/**
 * Integration Tests — RBAC (Role-Based Access Control)
 *
 * Verifies RLS policy boundaries. All tests share 'rbac-main';
 * cross-user RLS tests share 'rbac-other'.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
  offsetDate,
} from './helpers/supabase-test-client';

describe('RBAC Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  // ── Profile RLS ──────────────────────────────────────────────────────
  describe('profiles RLS', () => {
    it('employee sees own profile via SELECT', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data, error } = await client
        .from('profiles')
        .select('id')
        .eq('id', userId);
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].id).toBe(userId);
    });

    it('employee can update own profile', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { error } = await client
        .from('profiles')
        .update({ job_title: 'RBAC Test Job Title' })
        .eq('id', userId);
      expect(error).toBeNull();

      const { data } = await client
        .from('profiles')
        .select('job_title')
        .eq('id', userId)
        .single();
      expect(data!.job_title).toBe('RBAC Test Job Title');
    });

    it('employee cannot update another user profile', async () => {
      const { client } = await getTestUser('rbac-main');
      const { data } = await client
        .from('profiles')
        .update({ job_title: 'Hacked' })
        .eq('id', '00000000-0000-0000-0000-000000000000')
        .select();
      expect(data).toEqual([]);
    });
  });

  // ── Lookup tables readable by all ───────────────────────────────────
  describe('lookup table access', () => {
    it('employee can read departments', async () => {
      const { client } = await getTestUser('rbac-main');
      const { data, error } = await client.from('departments').select('id, name');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it('employee can read leave_types', async () => {
      const { client } = await getTestUser('rbac-main');
      const { data, error } = await client.from('leave_types').select('id, name');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
    });

    it('employee can read holidays', async () => {
      const { client } = await getTestUser('rbac-main');
      const { data, error } = await client.from('holidays').select('id, name, date');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ── Leave request RLS ──────────────────────────────────────────────
  describe('leave_requests RLS', () => {
    it('employee can create own leave request', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data: lt } = await client.from('leave_types').select('id').limit(1).single();
      const { data, error } = await client
        .from('leave_requests')
        .insert({
          employee_id: userId,
          leave_type_id: lt!.id,
          start_date: offsetDate(50),
          end_date: offsetDate(51),
          days_count: 2,
          reason: 'RBAC test leave request',
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data!.employee_id).toBe(userId);
      // Clean up
      await client.from('leave_requests').delete().eq('id', data!.id);
    });

    it('employee cannot create leave for other user', async () => {
      const { client } = await getTestUser('rbac-other');
      const { data: lt } = await client.from('leave_types').select('id').limit(1).single();
      const { error } = await client
        .from('leave_requests')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          leave_type_id: lt!.id,
          start_date: offsetDate(52),
          end_date: offsetDate(53),
          days_count: 2,
          reason: 'Should be blocked by RLS',
        });
      expect(error).toBeTruthy();
    });
  });

  // ── Attendance RLS ─────────────────────────────────────────────────
  describe('attendance RLS', () => {
    it('employee can insert own attendance', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data, error } = await client
        .from('attendance')
        .insert({
          employee_id: userId,
          date: offsetDate(-10),
          status: 'present',
        })
        .select()
        .single();
      expect(error).toBeNull();
      expect(data!.employee_id).toBe(userId);
      await client.from('attendance').delete().eq('id', data!.id);
    });

    it('employee cannot insert attendance for other user', async () => {
      const { client } = await getTestUser('rbac-other');
      const { error } = await client
        .from('attendance')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          date: offsetDate(-11),
          status: 'present',
        });
      expect(error).toBeTruthy();
    });
  });

  // ── Notification preferences RLS ────────────────────────────────────
  describe('user_notification_preferences RLS', () => {
    it('employee can read own preferences only', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data, error } = await client
        .from('user_notification_preferences')
        .select('user_id');
      expect(error).toBeNull();
      if (data && data.length > 0) {
        expect(data.every((p) => p.user_id === userId)).toBe(true);
      }
    });
  });

  // ── User roles RLS ─────────────────────────────────────────────────
  describe('user_roles RLS', () => {
    it('employee can see own role', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data, error } = await client
        .from('user_roles')
        .select('user_id, role')
        .eq('user_id', userId);
      expect(error).toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].role).toBe('employee');
    });

    it('employee cannot update own role', async () => {
      const { client, userId } = await getTestUser('rbac-main');
      const { data } = await client
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', userId)
        .select();
      expect(data).toEqual([]);
    });
  });
});
