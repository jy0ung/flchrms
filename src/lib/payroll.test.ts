import { describe, expect, it } from 'vitest';
import { calculateOverlappingLeaveDays, calculateWorkingDays } from '@/lib/payroll';

describe('payroll helpers', () => {
  it('calculates working days excluding weekends', () => {
    expect(calculateWorkingDays('2026-02-02', '2026-02-08')).toBe(5);
  });

  it('returns overlapping leave days within the payroll period', () => {
    expect(
      calculateOverlappingLeaveDays('2026-02-01', '2026-02-28', '2026-02-10', '2026-02-12'),
    ).toBe(3);
  });

  it('handles partial overlap when leave starts before payroll period', () => {
    expect(
      calculateOverlappingLeaveDays('2026-02-01', '2026-02-28', '2026-01-30', '2026-02-02'),
    ).toBe(2);
  });

  it('returns zero when leave is outside payroll period', () => {
    expect(
      calculateOverlappingLeaveDays('2026-02-01', '2026-02-28', '2026-03-01', '2026-03-03'),
    ).toBe(0);
  });
});
