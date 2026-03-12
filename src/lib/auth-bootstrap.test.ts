import { describe, expect, it, vi } from 'vitest';

import { isTransientAuthReadError, withAuthReadRetry } from '@/lib/auth-bootstrap';

describe('auth bootstrap retry helpers', () => {
  it('treats transport failures as transient', () => {
    expect(isTransientAuthReadError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientAuthReadError({ message: 'Load failed' })).toBe(true);
    expect(isTransientAuthReadError({ status: 503 })).toBe(true);
  });

  it('does not treat authorization failures as transient', () => {
    expect(isTransientAuthReadError({ status: 401, message: 'JWT expired' })).toBe(false);
    expect(isTransientAuthReadError({ status: 403 })).toBe(false);
  });

  it('retries transient reads before succeeding', async () => {
    vi.useFakeTimers();

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ready');

    const resultPromise = withAuthReadRetry(operation, { attempts: 2, delayMs: 50 });
    await vi.advanceTimersByTimeAsync(60);

    await expect(resultPromise).resolves.toBe('ready');
    expect(operation).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
