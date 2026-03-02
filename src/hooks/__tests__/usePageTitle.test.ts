import { describe, expect, it, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from '@/hooks/usePageTitle';

describe('usePageTitle', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it('sets document title with app name suffix', () => {
    renderHook(() => usePageTitle('Dashboard'));
    expect(document.title).toBe('Dashboard — FLCHRMS');
  });

  it('uses just app name when title is empty', () => {
    renderHook(() => usePageTitle(''));
    expect(document.title).toBe('FLCHRMS');
  });

  it('restores previous title on unmount', () => {
    document.title = 'Previous Title';
    const { unmount } = renderHook(() => usePageTitle('Test'));
    expect(document.title).toBe('Test — FLCHRMS');
    unmount();
    expect(document.title).toBe('Previous Title');
  });

  it('updates title when argument changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Page A' },
    });
    expect(document.title).toBe('Page A — FLCHRMS');

    rerender({ title: 'Page B' });
    expect(document.title).toBe('Page B — FLCHRMS');
  });

  it('handles special characters in title', () => {
    renderHook(() => usePageTitle('Employees & Payroll'));
    expect(document.title).toBe('Employees & Payroll — FLCHRMS');
  });
});
