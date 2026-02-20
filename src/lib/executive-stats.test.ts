import { describe, expect, it } from 'vitest';
import { calculateAbsentEmployees, COMPLETED_REVIEW_STATUSES } from '@/lib/executive-stats';

describe('executive stats helpers', () => {
  it('uses submitted and acknowledged as completed review states', () => {
    expect(COMPLETED_REVIEW_STATUSES).toEqual(['submitted', 'acknowledged']);
  });

  it('subtracts on-leave employees from absent count', () => {
    expect(calculateAbsentEmployees(20, 14, 3)).toBe(3);
  });

  it('never returns a negative absent count', () => {
    expect(calculateAbsentEmployees(10, 9, 4)).toBe(0);
  });
});
