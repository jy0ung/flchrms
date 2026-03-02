import { describe, expect, it } from 'vitest';
import { sanitizeErrorMessage } from '@/lib/error-utils';

describe('sanitizeErrorMessage', () => {
  // ── Fallback behaviour ─────────────────────────────────────────
  it('returns fallback for undefined input', () => {
    expect(sanitizeErrorMessage(undefined)).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('returns fallback for null input', () => {
    expect(sanitizeErrorMessage(null)).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('returns fallback for empty string', () => {
    expect(sanitizeErrorMessage('')).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('returns fallback for non-string / non-Error input (number)', () => {
    expect(sanitizeErrorMessage(42)).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('returns fallback for non-string / non-Error input (object)', () => {
    expect(sanitizeErrorMessage({ code: 500 })).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('uses custom fallback when provided', () => {
    expect(sanitizeErrorMessage(undefined, 'Custom fallback')).toBe(
      'Custom fallback',
    );
  });

  // ── Safe pass-through ──────────────────────────────────────────
  it('passes through a normal user-facing message', () => {
    expect(sanitizeErrorMessage('Leave request already exists')).toBe(
      'Leave request already exists',
    );
  });

  it('passes through Error objects with safe messages', () => {
    expect(sanitizeErrorMessage(new Error('Not enough balance'))).toBe(
      'Not enough balance',
    );
  });

  it('passes through plain string input', () => {
    expect(sanitizeErrorMessage('Something went wrong')).toBe(
      'Something went wrong',
    );
  });

  // ── Internal pattern sanitisation ──────────────────────────────
  it('hides check constraint violations', () => {
    expect(
      sanitizeErrorMessage('violates check constraint "positive_days"'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides foreign key constraint violations', () => {
    expect(
      sanitizeErrorMessage(
        'violates foreign key constraint "fk_employee_id"',
      ),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides unique constraint violations', () => {
    expect(
      sanitizeErrorMessage('violates unique constraint "uq_email"'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides not-null constraint violations', () => {
    expect(
      sanitizeErrorMessage('violates not-null constraint "nn_name"'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides "relation does not exist" errors', () => {
    expect(
      sanitizeErrorMessage('relation "public.employees" does not exist'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides "column does not exist" errors', () => {
    expect(
      sanitizeErrorMessage('column "foobar" does not exist'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides "column of relation" errors', () => {
    expect(
      sanitizeErrorMessage('column "id" of relation "users"'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides permission denied for table', () => {
    expect(
      sanitizeErrorMessage('permission denied for table employees'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides permission denied for schema', () => {
    expect(
      sanitizeErrorMessage('permission denied for schema public'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides permission denied for function', () => {
    expect(
      sanitizeErrorMessage('permission denied for function approve_leave'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides duplicate key value violations', () => {
    expect(
      sanitizeErrorMessage('duplicate key value violates unique constraint'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides null value in column errors', () => {
    expect(
      sanitizeErrorMessage('null value in column "name" violates not-null'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides syntax errors', () => {
    expect(
      sanitizeErrorMessage('syntax error at or near "SELECT"'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides stack tracebacks', () => {
    expect(
      sanitizeErrorMessage('Error: something\nStack traceback:\n  line 5'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides pg_catalog references', () => {
    expect(
      sanitizeErrorMessage('pg_catalog.int4 type mismatch'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  it('hides PostgREST error codes (PGRST)', () => {
    expect(
      sanitizeErrorMessage('PGRST204 No Content'),
    ).toBe('An unexpected error occurred. Please try again.');
  });

  // ── Error object with internal message ─────────────────────────
  it('sanitises Error objects with internal messages', () => {
    const err = new Error('duplicate key value violates unique constraint "uq"');
    expect(sanitizeErrorMessage(err)).toBe(
      'An unexpected error occurred. Please try again.',
    );
  });

  it('sanitises Error objects with custom fallback', () => {
    const err = new Error('relation "foo" does not exist');
    expect(sanitizeErrorMessage(err, 'Oops!')).toBe('Oops!');
  });

  // ── Length truncation ──────────────────────────────────────────
  it('truncates messages longer than 200 characters', () => {
    const longMsg = 'A'.repeat(250);
    const result = sanitizeErrorMessage(longMsg);
    expect(result.length).toBe(201); // 200 chars + "…"
    expect(result.endsWith('…')).toBe(true);
  });

  it('does not truncate messages at exactly 200 characters', () => {
    const msg200 = 'B'.repeat(200);
    expect(sanitizeErrorMessage(msg200)).toBe(msg200);
  });

  it('does not truncate messages shorter than 200 characters', () => {
    const short = 'Short message';
    expect(sanitizeErrorMessage(short)).toBe(short);
  });
});
