/**
 * Integration Tests — Notifications & Preferences
 *
 * Fixed schema: user_notification_preferences uses boolean columns
 * (leave_enabled, email_leave_enabled, etc.), NOT category/in_app_enabled.
 * leave_request_events uses actor_user_id, NOT actor_id.
 *
 * All tests share 'notif-main'; RLS test uses 'notif-rls'.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
} from './helpers/supabase-test-client';

describe('Notifications & Preferences Integration', () => {
  afterAll(async () => {
    const { client, userId } = await getTestUser('notif-main');
    await client
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', userId);
    await cleanupClients();
  });

  // ── User Notifications ───────────────────────────────────────────────
  describe('user_notifications', () => {
    it('employee can query own notifications', async () => {
      const { client, userId } = await getTestUser('notif-main');
      const { data, error } = await client
        .from('user_notifications')
        .select('id, title, message, read_at')
        .eq('user_id', userId)
        .limit(10);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('notification query returns correct columns', async () => {
      const { client, userId } = await getTestUser('notif-main');
      const { data, error } = await client
        .from('user_notifications')
        .select('id, user_id, title, message, read_at, created_at')
        .eq('user_id', userId)
        .limit(1);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ── User Notification Preferences ───────────────────────────────────
  describe('user_notification_preferences', () => {
    it('employee can read own notification preferences', async () => {
      const { client, userId } = await getTestUser('notif-main');
      const { data, error } = await client
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('can upsert a notification preference', async () => {
      const { client, userId } = await getTestUser('notif-main');

      const { data, error } = await client
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: userId,
            leave_enabled: true,
            email_leave_enabled: false,
            admin_enabled: true,
            email_admin_enabled: true,
            system_enabled: true,
            email_system_enabled: false,
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data!.user_id).toBe(userId);
      expect(data!.leave_enabled).toBe(true);
      expect(data!.email_leave_enabled).toBe(false);
    });

    it('can update own notification preference', async () => {
      const { client, userId } = await getTestUser('notif-main');

      const { error } = await client
        .from('user_notification_preferences')
        .update({ email_leave_enabled: true })
        .eq('user_id', userId);

      expect(error).toBeNull();

      const { data } = await client
        .from('user_notification_preferences')
        .select('email_leave_enabled')
        .eq('user_id', userId)
        .single();

      expect(data!.email_leave_enabled).toBe(true);
    });

    it('cannot insert preferences for another user', async () => {
      const { client } = await getTestUser('notif-rls');

      const { error } = await client
        .from('user_notification_preferences')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          leave_enabled: true,
          email_leave_enabled: false,
          admin_enabled: true,
          email_admin_enabled: true,
          system_enabled: true,
          email_system_enabled: false,
        });

      expect(error).toBeTruthy();
    });
  });

  // ── Leave Request Events (audit log) ────────────────────────────────
  describe('leave_request_events', () => {
    it('can query leave request events', async () => {
      const { client } = await getTestUser('notif-main');
      const { data, error } = await client
        .from('leave_request_events')
        .select('id, leave_request_id, event_type, actor_user_id')
        .limit(10);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
