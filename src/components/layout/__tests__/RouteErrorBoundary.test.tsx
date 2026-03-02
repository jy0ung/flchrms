import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RouteErrorBoundary } from '@/components/layout/RouteErrorBoundary';

function ThrowingChild() {
  throw new Error('Test rendering error');
}

function GoodChild() {
  return <div data-testid="good-child">All good</div>;
}

describe('RouteErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <RouteErrorBoundary>
        <GoodChild />
      </RouteErrorBoundary>,
    );
    expect(screen.getByTestId('good-child')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RouteErrorBoundary>
        <ThrowingChild />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/page error occurred/i)).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows "Retry Render" button on error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RouteErrorBoundary>
        <ThrowingChild />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /retry render/i })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('shows "Reload Page" button on error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <RouteErrorBoundary>
        <ThrowingChild />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('resets error state when "Retry Render" is clicked', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) throw new Error('boom');
      return <div data-testid="recovered">Recovered!</div>;
    }

    const { rerender } = render(
      <RouteErrorBoundary>
        <ConditionalChild />
      </RouteErrorBoundary>,
    );

    // Should show error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry render/i }));

    // Re-render to allow the boundary to render children again
    rerender(
      <RouteErrorBoundary>
        <ConditionalChild />
      </RouteErrorBoundary>,
    );

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('resets error state when resetKey changes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    function ConditionalChild() {
      if (shouldThrow) throw new Error('boom');
      return <div data-testid="recovered">Recovered!</div>;
    }

    const { rerender } = render(
      <RouteErrorBoundary resetKey="key-1">
        <ConditionalChild />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow = false;
    rerender(
      <RouteErrorBoundary resetKey="key-2">
        <ConditionalChild />
      </RouteErrorBoundary>,
    );

    expect(screen.getByTestId('recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
