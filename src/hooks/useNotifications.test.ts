import { describe, expect, it } from 'vitest';

import { getNotificationPollInterval } from '@/hooks/useNotifications';

describe('notification polling controls', () => {
  it('disables polling when polling is turned off', () => {
    expect(getNotificationPollInterval(false)).toBe(false);
  });

  it('disables polling while the document is hidden', () => {
    const originalVisibilityState = document.visibilityState;

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });

    expect(getNotificationPollInterval(true)).toBe(false);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: originalVisibilityState,
    });
  });
});
