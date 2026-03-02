import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (class name merge utility)', () => {
  it('merges simple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('handles null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('handles boolean false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('handles empty string', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('returns empty string with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles conditional classes (clsx-style object)', () => {
    expect(cn({ 'bg-red-500': true, 'bg-blue-500': false })).toBe('bg-red-500');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  // ── Tailwind merge behaviour ───────────────────────────────────
  it('resolves conflicting Tailwind classes (twMerge)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves conflicting bg colors', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
  });

  it('resolves conflicting text sizes', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg');
  });

  it('keeps non-conflicting Tailwind classes', () => {
    const result = cn('p-4', 'mx-2', 'text-sm');
    expect(result).toContain('p-4');
    expect(result).toContain('mx-2');
    expect(result).toContain('text-sm');
  });

  it('resolves conflicting responsive variants', () => {
    expect(cn('md:p-4', 'md:p-2')).toBe('md:p-2');
  });

  it('keeps different responsive variants', () => {
    const result = cn('sm:p-4', 'md:p-2');
    expect(result).toContain('sm:p-4');
    expect(result).toContain('md:p-2');
  });
});
