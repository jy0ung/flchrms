/**
 * Integration Tests — Payroll & Documents
 *
 * All tests share a single user ('payroll-main').
 */
import { describe, it, expect, afterAll } from 'vitest';
import {
  getTestUser,
  cleanupClients,
} from './helpers/supabase-test-client';

describe('Payroll & Documents Integration', () => {
  afterAll(async () => {
    await cleanupClients();
  });

  describe('salary_structures', () => {
    it('employee can query own salary structure', async () => {
      const { client, userId } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('salary_structures')
        .select('*')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('deduction_types', () => {
    it('authenticated user can read deduction types', async () => {
      const { client } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('deduction_types')
        .select('id, name, deduction_type, default_value, is_mandatory, is_active');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('deduction type has correct field types', async () => {
      const { client } = await getTestUser('payroll-main');
      const { data } = await client
        .from('deduction_types')
        .select('name, deduction_type, default_value, is_mandatory')
        .limit(1);
      if (data && data.length > 0) {
        expect(typeof data[0].name).toBe('string');
        expect(['fixed', 'percentage']).toContain(data[0].deduction_type);
        expect(typeof data[0].is_mandatory).toBe('boolean');
      }
    });
  });

  describe('employee_deductions', () => {
    it('employee can query own deductions', async () => {
      const { client, userId } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('employee_deductions')
        .select('id, employee_id, deduction_type_id, amount, is_active')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('payroll_periods', () => {
    it('can query payroll periods', async () => {
      const { client } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('payroll_periods')
        .select('id, name, start_date, end_date, status');
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('payslips', () => {
    it('employee can query own payslips', async () => {
      const { client, userId } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('payslips')
        .select('id, employee_id, basic_salary, net_salary, status')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });

    it('payslip can join to payroll_periods', async () => {
      const { client } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('payslips')
        .select('id, payroll_periods(name, status)')
        .limit(1);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('documents', () => {
    it('employee can query own documents', async () => {
      const { client, userId } = await getTestUser('payroll-main');
      const { data, error } = await client
        .from('documents')
        .select('id, employee_id, title, category, file_name')
        .eq('employee_id', userId);
      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
