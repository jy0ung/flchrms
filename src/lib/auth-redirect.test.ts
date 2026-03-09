import { describe, expect, it } from 'vitest';

import {
  DEFAULT_POST_AUTH_TARGET,
  buildAuthRedirectHref,
  resolvePostAuthTarget,
} from '@/lib/auth-redirect';

describe('auth redirect helpers', () => {
  it('builds an auth redirect href with the requested route', () => {
    expect(
      buildAuthRedirectHref({
        pathname: '/payroll',
        search: '?tab=salaries',
        hash: '#current',
      }),
    ).toBe('/auth?redirect=%2Fpayroll%3Ftab%3Dsalaries%23current');
  });

  it('prefers location state when resolving the post-auth target', () => {
    expect(
      resolvePostAuthTarget({
        state: {
          from: {
            pathname: '/leave',
            search: '?workspaceView=TEAM_CURRENT',
          },
        },
        search: '?redirect=%2Fdashboard',
      }),
    ).toBe('/leave?workspaceView=TEAM_CURRENT');
  });

  it('uses the redirect query param when no state is available', () => {
    expect(
      resolvePostAuthTarget({
        search: '?redirect=%2Femployees%3FemployeeId%3Dabc',
      }),
    ).toBe('/employees?employeeId=abc');
  });

  it('falls back to the default dashboard target for unsafe redirects', () => {
    expect(
      resolvePostAuthTarget({
        search: '?redirect=https%3A%2F%2Fevil.example',
      }),
    ).toBe(DEFAULT_POST_AUTH_TARGET);
  });
});
