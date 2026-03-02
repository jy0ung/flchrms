/**
 * Integration Tests — Authentication
 *
 * Tests real Supabase auth flows: sign-up, sign-in, session, sign-out,
 * invalid credentials, and trigger-created profile/role.
 *
 * Uses a shared signup user where possible to minimise auth rate-limit hits.
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  createAnonClient,
  getTestUser,
  cleanupClients,
  testEmail,
  TEST_PASSWORD,
} from './helpers/supabase-test-client';

describe('Auth Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  // ── Sign-up ──────────────────────────────────────────────────────────
  it('creates a new user via signUp', async () => {
    const email = testEmail('signup');
    const client = createAnonClient();

    const { data, error } = await client.auth.signUp({
      email,
      password: TEST_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user!.email).toBe(email);
    expect(data.user!.id).toBeTruthy();
    expect(data.session).toBeTruthy();
    expect(data.session!.access_token).toBeTruthy();

    await client.auth.signOut();
  });

  // ── Session & User (must run before signIn test which clears session) ─
  it('getSession returns valid session after sign-in', async () => {
    const { client, userId } = await getTestUser('auth-main');

    const { data, error } = await client.auth.getSession();

    expect(error).toBeNull();
    expect(data.session).toBeTruthy();
    expect(data.session!.user.id).toBe(userId);
  });

  it('getUser returns the authenticated user', async () => {
    const { client, email } = await getTestUser('auth-main');

    const { data, error } = await client.auth.getUser();

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user!.email).toBe(email);
  });

  // ── Sign-in ──────────────────────────────────────────────────────────
  it('signs in with correct credentials', async () => {
    const { email } = await getTestUser('auth-main');

    // Use a fresh client so we don't disturb the cached one
    const freshClient = createAnonClient();
    const { data, error } = await freshClient.auth.signInWithPassword({
      email,
      password: TEST_PASSWORD,
    });

    expect(error).toBeNull();
    expect(data.user).toBeTruthy();
    expect(data.user!.email).toBe(email);
    expect(data.session).toBeTruthy();

    await freshClient.auth.signOut();
  });

  // ── Sign-out ─────────────────────────────────────────────────────────
  it('signs out successfully and clears session', async () => {
    const email = testEmail('signout');
    const client = createAnonClient();
    await client.auth.signUp({ email, password: TEST_PASSWORD });

    const { error } = await client.auth.signOut();
    expect(error).toBeNull();

    const { data } = await client.auth.getSession();
    expect(data.session).toBeNull();
  });

  // ── Invalid credentials ──────────────────────────────────────────────
  it('rejects sign-in with wrong password', async () => {
    const { email } = await getTestUser('auth-main');
    const client = createAnonClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password: 'WrongPassword!',
    });

    expect(error).toBeTruthy();
    expect(error!.message).toContain('Invalid login credentials');
    expect(data.user).toBeNull();
    expect(data.session).toBeNull();
  });

  it('rejects sign-in with non-existent email', async () => {
    const client = createAnonClient();

    const { data, error } = await client.auth.signInWithPassword({
      email: 'nonexistent-integration-test@flchrms.test',
      password: TEST_PASSWORD,
    });

    expect(error).toBeTruthy();
    expect(data.user).toBeNull();
  });

  // ── Auto-created profile & role ──────────────────────────────────────
  it('handle_new_user trigger creates a profile on signup', async () => {
    const { client, userId, email } = await getTestUser('auth-trigger');

    const { data: profile, error } = await client
      .from('profiles')
      .select('id, email, status')
      .eq('id', userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile!.id).toBe(userId);
    expect(profile!.email).toBe(email);
  });

  it('handle_new_user trigger creates a user_role on signup', async () => {
    const { client, userId } = await getTestUser('auth-trigger');

    const { data: roles, error } = await client
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', userId);

    expect(error).toBeNull();
    expect(roles).toBeTruthy();
    expect(roles!.length).toBeGreaterThanOrEqual(1);
    expect(roles![0].role).toBe('employee');
  });
});
