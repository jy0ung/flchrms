/**
 * Integration Tests — Training & Performance
 *
 * All tests share a single user ('training-main').
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
} from './helpers/supabase-test-client';

describe('Training & Performance Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  describe('training_programs', () => {
    it('authenticated user can query training programs', async () => {
      const { client } = await getTestUser('training-main');
      const { data, error } = await client
        .from('training_programs')
        .select('id, title, category, duration_hours, is_mandatory');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('training program fields have correct types', async () => {
      const { client } = await getTestUser('training-main');
      const { data } = await client
        .from('training_programs')
        .select('id, title, duration_hours, is_mandatory')
        .limit(1);
      if (data && data.length > 0) {
        expect(typeof data[0].title).toBe('string');
        expect(typeof data[0].duration_hours).toBe('number');
        expect(typeof data[0].is_mandatory).toBe('boolean');
      }
    });
  });

  describe('training_enrollments', () => {
    it('employee can query own enrollments', async () => {
      const { client, userId } = await getTestUser('training-main');
      const { data, error } = await client
        .from('training_enrollments')
        .select('id, employee_id, program_id, status, score')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('enrollment can join to training_programs', async () => {
      const { client } = await getTestUser('training-main');
      const { data, error } = await client
        .from('training_enrollments')
        .select('id, status, training_programs(title, category)')
        .limit(1);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('performance_reviews', () => {
    it('employee can query own performance reviews', async () => {
      const { client, userId } = await getTestUser('training-main');
      const { data, error } = await client
        .from('performance_reviews')
        .select('id, employee_id, reviewer_id, overall_rating, status')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
