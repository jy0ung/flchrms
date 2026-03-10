import { describe, expect, it } from 'vitest';

import { getRouteLabel, getTopBarTitle } from './navigation-labels';

describe('navigation labels', () => {
  it('returns mapped route labels and falls back to the raw segment', () => {
    expect(getRouteLabel('departments')).toBe('Departments');
    expect(getRouteLabel('unknown-segment')).toBe('unknown-segment');
  });

  it('derives exact top-bar titles for admin and nested routes', () => {
    expect(getTopBarTitle('/admin/dashboard')).toBe('Governance Dashboard');
    expect(getTopBarTitle('/admin/quick-actions')).toBe('Governance Hub');
    expect(getTopBarTitle('/employees/123')).toBe('Employees');
    expect(getTopBarTitle('/departments')).toBe('Departments');
  });
});
