/**
 * Integration Tests — Announcements, Holidays, Calendar
 *
 * All tests share a single user ('calendar-main').
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
} from './helpers/supabase-test-client';

describe('Announcements & Calendar Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  describe('announcements', () => {
    it('authenticated user can query announcements', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data, error } = await client
        .from('announcements')
        .select('id, title, content, priority, is_active, published_at, expires_at');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('active announcements have required fields when present', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data } = await client
        .from('announcements')
        .select('id, title, content, priority, is_active')
        .eq('is_active', true)
        .limit(1);
      if (data && data.length > 0) {
        expect(data[0].id).toBeTruthy();
        expect(data[0].title).toBeTruthy();
        expect(data[0].content).toBeTruthy();
      }
    });
  });

  describe('holidays', () => {
    it('authenticated user can read all holidays', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data, error } = await client
        .from('holidays')
        .select('id, name, date, is_recurring');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('holiday records have date in YYYY-MM-DD format', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data } = await client.from('holidays').select('date').limit(1);
      if (data && data.length > 0) {
        expect(data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('department_events', () => {
    it('authenticated user can query department events', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data, error } = await client
        .from('department_events')
        .select('id, title, department_id, event_date, event_type');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('leave_types', () => {
    it('returns leave types for calendar/form population', async () => {
      const { client } = await getTestUser('calendar-main');
      const { data, error } = await client
        .from('leave_types')
        .select('id, name, days_allowed, is_paid');
      expect(error).toBeNull();
      expect(data!.length).toBeGreaterThanOrEqual(1);
      expect(data![0].name).toBeTruthy();
    });
  });
});
