import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onTimeout after the specified duration', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('defaults to 30 minutes if no timeout specified', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout));

    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000 - 1);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on mouse movement', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    // Advance almost to timeout
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Simulate mouse movement — resets timer
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Advance 4s after reset — should not fire yet
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    // Advance the remaining 1s — should fire
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on keydown', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event('keydown'));
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on scroll', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event('scroll'));
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on touchstart', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event('touchstart'));
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('resets timer on mousedown', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
      document.dispatchEvent(new Event('mousedown'));
    });

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not call timeout when disabled', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000, false));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('cleans up event listeners on unmount', () => {
    const onTimeout = vi.fn();
    const { unmount } = renderHook(() => useIdleTimeout(onTimeout, 5000));

    unmount();

    // Timer should be cleared, so advancing shouldn't trigger callback
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resets on visibility change to visible', () => {
    const onTimeout = vi.fn();
    renderHook(() => useIdleTimeout(onTimeout, 5000));

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Simulate tab becoming visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Timer was reset — needs full 5s again
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
