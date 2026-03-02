/**
 * Integration Tests — Attendance
 *
 * All tests share 'attend-main'; only the RLS cross-user test uses 'attend-rls'.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
  offsetDate,
} from './helpers/supabase-test-client';

describe('Attendance Integration', () => {
  const createdAttendanceIds: string[] = [];

  afterAll(async () => {
    const { client, userId } = await getTestUser('attend-main');
    for (const id of createdAttendanceIds) {
      await client.from('attendance').delete().eq('id', id).eq('employee_id', userId);
    }
    await cleanupClients();
  });

  it('employee can insert own attendance record', async () => {
    const { client, userId } = await getTestUser('attend-main');
    const yesterday = offsetDate(-1);
    const { data, error } = await client
      .from('attendance')
      .insert({
        employee_id: userId,
        date: yesterday,
        clock_in: `${yesterday}T08:55:00`,
        clock_out: `${yesterday}T17:30:00`,
        status: 'present',
        notes: 'Integration test attendance',
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.employee_id).toBe(userId);
    expect(data!.status).toBe('present');
    expect(data!.date).toBe(yesterday);
    createdAttendanceIds.push(data!.id);
  });

  it('employee can read own attendance records', async () => {
    const { client, userId } = await getTestUser('attend-main');
    const { data, error } = await client
      .from('attendance')
      .select('*')
      .eq('employee_id', userId);
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.every((a) => a.employee_id === userId)).toBe(true);
  });

  it('attendance record has valid date format', async () => {
    const { client, userId } = await getTestUser('attend-main');
    const { data } = await client
      .from('attendance')
      .select('date')
      .eq('employee_id', userId)
      .limit(1)
      .single();
    expect(data!.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('can insert clock-in only (no clock-out)', async () => {
    const { client, userId } = await getTestUser('attend-main');
    const twoDaysAgo = offsetDate(-2);
    const { data, error } = await client
      .from('attendance')
      .insert({
        employee_id: userId,
        date: twoDaysAgo,
        clock_in: `${twoDaysAgo}T09:05:00`,
        status: 'late',
        notes: 'Integration test: clocked in late, no clock-out',
      })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.clock_out).toBeNull();
    expect(data!.status).toBe('late');
    createdAttendanceIds.push(data!.id);
  });

  it('employee cannot insert attendance for another user', async () => {
    const { client } = await getTestUser('attend-rls');
    const { error } = await client
      .from('attendance')
      .insert({
        employee_id: '00000000-0000-0000-0000-000000000000',
        date: offsetDate(-3),
        status: 'present',
      });
    expect(error).toBeTruthy();
  });
});
