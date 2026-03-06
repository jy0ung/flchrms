import { describe, expect, it } from 'vitest';

import { formatLeaveActorLabel } from '@/modules/leave/hooks/useLeaveRequestDetails';

describe('formatLeaveActorLabel', () => {
  it('prefers the fallback role label over a raw UUID when actor details are unavailable', () => {
    expect(formatLeaveActorLabel(undefined, '3d905387-bdad-45c4-951d-f4a1f58e6f09', 'Manager')).toBe('Manager');
  });

  it('uses actor identity details when they are available', () => {
    expect(formatLeaveActorLabel({
      id: 'user-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
    }, 'user-1', 'Manager')).toBe('Jane Doe (Manager)');
  });
});
