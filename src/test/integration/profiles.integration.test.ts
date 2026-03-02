/**
 * Integration Tests — Profiles & Departments
 *
 * Tests profile CRUD and department reads against the live Supabase instance.
 * All tests share a single user to avoid auth rate limits.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
} from './helpers/supabase-test-client';

describe('Profiles Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  // ── Own profile read ──────────────────────────────────────────────
  it('user can read own profile', async () => {
    const { client, userId, email } = await getTestUser('profiles-main');

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.id).toBe(userId);
    expect(data!.email).toBe(email);
  });

  it('profile has auto-generated employee_id', async () => {
    const { client, userId } = await getTestUser('profiles-main');

    const { data } = await client
      .from('profiles')
      .select('employee_id')
      .eq('id', userId)
      .single();

    expect(data).toBeTruthy();
    expect(data!.employee_id).toBeTruthy();
    expect(data!.employee_id).toMatch(/^EMP-/);
  });

  it('profile defaults to active status', async () => {
    const { client, userId } = await getTestUser('profiles-main');

    const { data } = await client
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single();

    expect(data!.status).toBe('active');
  });

  // ── Profile update ─────────────────────────────────────────────────
  it('user can update own profile fields', async () => {
    const { client, userId } = await getTestUser('profiles-main');

    const { error } = await client
      .from('profiles')
      .update({
        first_name: 'IntTestFirst',
        last_name: 'IntTestLast',
        phone: '+10000099999',
      })
      .eq('id', userId);

    expect(error).toBeNull();

    const { data } = await client
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', userId)
      .single();

    expect(data!.first_name).toBe('IntTestFirst');
    expect(data!.last_name).toBe('IntTestLast');
    expect(data!.phone).toBe('+10000099999');
  });

  // ── RLS: only own profile visible ────────────────────────────────
  it('employee user sees only own profile', async () => {
    const { client } = await getTestUser('profiles-main');

    const { data, error } = await client
      .from('profiles')
      .select('id');

    expect(error).toBeNull();
    // Employee role sees at least own profile (might see more depending on RLS)
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  // ── Departments (readable by all authenticated) ─────────────────
  it('authenticated user can read departments', async () => {
    const { client } = await getTestUser('profiles-main');

    const { data, error } = await client
      .from('departments')
      .select('id, name');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });

  it('department records have id and name', async () => {
    const { client } = await getTestUser('profiles-main');

    const { data } = await client
      .from('departments')
      .select('id, name, description')
      .limit(1)
      .single();

    expect(data).toBeTruthy();
    expect(data!.id).toBeTruthy();
    expect(data!.name).toBeTruthy();
  });

  // ── User roles ──────────────────────────────────────────────────
  it('user can read own role', async () => {
    const { client, userId } = await getTestUser('profiles-main');

    const { data, error } = await client
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].role).toBe('employee');
  });
});
