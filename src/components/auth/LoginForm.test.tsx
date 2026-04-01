import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from '@/components/auth/LoginForm';

describe('LoginForm', () => {
  it('renders associated labels for identifier and password fields', () => {
    render(<LoginForm onSubmit={vi.fn().mockResolvedValue({ error: null })} />);

    expect(screen.getByLabelText(/Email, username, or ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
  });

  it('shows structured invalid-credentials error without revealing account existence', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: new Error('Invalid login credentials') });
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'someone' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'bad-pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Unable to sign in with provided credentials/i);
    expect(alert).not.toHaveTextContent(/username does not exist|user not found|email not found/i);
  });

  it('disables submit and shows loading state during request', async () => {
    let resolvePromise: (value: { error: Error | null }) => void = () => undefined;
    const onSubmit = vi.fn(
      () =>
        new Promise<{ error: Error | null }>((resolve) => {
          resolvePromise = resolve;
        }),
    );

    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'emp-001' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'StrongPass1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    const submittingButton = screen.getByRole('button', { name: /Signing in…/i });
    expect(submittingButton).toBeDisabled();

    resolvePromise({ error: null });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Sign In$/i })).toBeEnabled();
    });
  });

  it('shows caps lock warning when caps lock is active', async () => {
    render(<LoginForm onSubmit={vi.fn().mockResolvedValue({ error: null })} />);

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    const capsEvent = new KeyboardEvent('keydown', { key: 'A', bubbles: true });
    Object.defineProperty(capsEvent, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    act(() => {
      passwordInput.dispatchEvent(capsEvent);
    });

    expect(await screen.findByText(/Caps Lock is on/i)).toBeInTheDocument();
  });

  it('has accessible password visibility toggle', () => {
    render(<LoginForm onSubmit={vi.fn().mockResolvedValue({ error: null })} />);

    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /Show password/i });

    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(passwordInput.type).toBe('password');

    fireEvent.click(toggleButton);

    expect(screen.getByRole('button', { name: /Hide password/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(passwordInput.type).toBe('text');
  });

  it('supports keyboard-only submit using Enter on password input', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: null });
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'employee@company.com' },
    });
    const passwordInput = screen.getByLabelText(/^Password$/i);
    fireEvent.change(passwordInput, {
      target: { value: 'StrongPass1!' },
    });

    fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('clears error state when user types again', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: new Error('Invalid login credentials') });
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'someone' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'bad-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'someone-else' },
    });

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('shows network error banner on connectivity failures', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ error: new Error('Failed to fetch') });
    render(<LoginForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Email, username, or ID/i), {
      target: { value: 'employee@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: 'StrongPass1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Unable to reach authentication service/i);
  });
});
