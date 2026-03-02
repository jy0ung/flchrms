/**
 * Integration Test Helper — Supabase Client Factory
 *
 * Creates real Supabase clients authenticated via signUp/signIn.
 * Users are created dynamically — no pre-seeded data required.
 *
 * Works against the hosted Supabase instance using anon key.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// ── Env (Vite-style, available in Vitest via import.meta.env) ──────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Integration tests require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env',
  );
}

// ── Constants ──────────────────────────────────────────────────────────
export const TEST_PASSWORD = 'Test1234!';

/**
 * Generates a unique test email to avoid collisions across runs.
 */
export function testEmail(label: string): string {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return `inttest-${label}-${suffix}@flchrms.test`;
}

// ── Client cache ───────────────────────────────────────────────────────
const clientCache = new Map<string, { client: SupabaseClient<Database>; userId: string; email: string }>();

/**
 * Creates a fresh (unauthenticated) Supabase client with in-memory storage.
 */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
}

/**
 * Sleep helper for retry backoff.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new user via signUp and returns the authenticated client + userId.
 * If the email already exists, falls back to signInWithPassword.
 * Results are cached by key for reuse within a test suite.
 * Retries with exponential backoff on rate-limit errors.
 */
export async function getTestUser(
  key: string,
  email?: string,
): Promise<{ client: SupabaseClient<Database>; userId: string; email: string }> {
  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  const resolvedEmail = email || testEmail(key);
  const maxRetries = 4;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = createAnonClient();

    // Try sign-in first (for re-runs with same email)
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: resolvedEmail,
      password: TEST_PASSWORD,
    });

    if (!signInError && signInData.user) {
      const entry = { client, userId: signInData.user.id, email: resolvedEmail };
      clientCache.set(key, entry);
      return entry;
    }

    // If rate limited on sign-in, retry
    if (signInError?.message?.toLowerCase().includes('rate limit')) {
      const delay = 2000 * Math.pow(2, attempt);
      await sleep(delay);
      continue;
    }

    // Sign up
    const { data: signUpData, error: signUpError } = await client.auth.signUp({
      email: resolvedEmail,
      password: TEST_PASSWORD,
    });

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('rate limit') && attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      throw new Error(`Failed to create test user ${resolvedEmail}: ${signUpError.message}`);
    }

    const userId = signUpData.user!.id;
    const entry = { client, userId, email: resolvedEmail };
    clientCache.set(key, entry);
    return entry;
  }

  throw new Error(`Failed to create test user ${resolvedEmail} after ${maxRetries} retries (rate limited)`);
}

// ── Pre-existing admin credentials ─────────────────────────────────────
export const ADMIN_EMAIL = 'admin@flchrms.test';
export const ADMIN_USER_ID = 'f771e28e-4f0c-4bd4-b3b6-0e10e18da292';

/**
 * Returns an authenticated client for the pre-existing admin user.
 * Cached under key 'admin'.
 */
export async function getAdminClient(): Promise<{
  client: SupabaseClient<Database>;
  userId: string;
  email: string;
}> {
  return getTestUser('admin', ADMIN_EMAIL);
}

/**
 * Sign out and clear the client cache. Call in afterAll().
 */
export async function cleanupClients(): Promise<void> {
  for (const [, { client }] of clientCache) {
    await client.auth.signOut().catch(() => {});
  }
  clientCache.clear();
}

/**
 * Helper to generate an ISO date string offset from today.
 */
export function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
