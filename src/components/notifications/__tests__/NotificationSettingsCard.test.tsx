import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { NotificationSettingsCard } from '@/components/notifications/NotificationSettingsCard';

// ── Mock hooks ───────────────────────────────────────────────────
const mockUpdateCategoryEnabled = vi.fn();
const mockUpdateEmailCategoryEnabled = vi.fn();
let mockPreferences: Record<string, boolean> | null = null;
let mockIsLoading = false;
let mockIsUpdating = false;

vi.mock('@/hooks/useNotifications', () => ({
  useNotificationPreferences: () => ({
    preferences: mockPreferences,
    isLoading: mockIsLoading,
    isUpdating: mockIsUpdating,
    updateCategoryEnabled: mockUpdateCategoryEnabled,
    updateEmailCategoryEnabled: mockUpdateEmailCategoryEnabled,
  }),
}));

beforeEach(() => {
  mockPreferences = {
    leave_enabled: true,
    admin_enabled: true,
    system_enabled: true,
    email_leave_enabled: false,
    email_admin_enabled: false,
    email_system_enabled: false,
  };
  mockIsLoading = false;
  mockIsUpdating = false;
  mockUpdateCategoryEnabled.mockClear();
  mockUpdateEmailCategoryEnabled.mockClear();
  window.localStorage.clear();
});

describe('NotificationSettingsCard', () => {
  it('renders the card header by default', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('hides the card header when showHeader=false', () => {
    render(<NotificationSettingsCard showHeader={false} />);
    expect(screen.queryByText('Notification Preferences')).not.toBeInTheDocument();
  });

  it('renders the floating notification toggle', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Floating Notification Button')).toBeInTheDocument();
    expect(screen.getByLabelText('Floating Notification Button')).toBeInTheDocument();
  });

  it('renders in-app notification preference toggles', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Leave Workflow')).toBeInTheDocument();
    expect(screen.getByText('Workflow Configuration')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('renders email delivery queue toggles', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Leave Workflow Emails')).toBeInTheDocument();
    expect(screen.getByText('Workflow Config Emails')).toBeInTheDocument();
    expect(screen.getByText('System Emails')).toBeInTheDocument();
  });

  it('renders workspace UI section', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Workspace UI')).toBeInTheDocument();
  });

  it('renders in-app notifications section', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
  });

  it('renders email delivery queue section', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText('Email Delivery Queue')).toBeInTheDocument();
  });

  it('shows descriptions for each preference', () => {
    render(<NotificationSettingsCard />);
    expect(screen.getByText(/approvals, rejections, cancellation/i)).toBeInTheDocument();
    expect(screen.getByText(/workflow builder changes/i)).toBeInTheDocument();
  });

  it('calls updateCategoryEnabled on in-app toggle', () => {
    render(<NotificationSettingsCard />);
    const leaveSwitch = screen.getByLabelText('Leave Workflow');
    fireEvent.click(leaveSwitch);
    expect(mockUpdateCategoryEnabled).toHaveBeenCalledWith('leave', false);
  });

  it('calls updateEmailCategoryEnabled on email toggle', () => {
    render(<NotificationSettingsCard />);
    const emailLeaveSwitch = screen.getByLabelText('Leave Workflow Emails');
    fireEvent.click(emailLeaveSwitch);
    expect(mockUpdateEmailCategoryEnabled).toHaveBeenCalledWith('leave', true);
  });

  it('disables toggles when loading', () => {
    mockIsLoading = true;
    render(<NotificationSettingsCard />);
    const leaveSwitch = screen.getByLabelText('Leave Workflow');
    expect(leaveSwitch).toBeDisabled();
  });

  it('disables toggles when updating', () => {
    mockIsUpdating = true;
    render(<NotificationSettingsCard />);
    const leaveSwitch = screen.getByLabelText('Leave Workflow');
    expect(leaveSwitch).toBeDisabled();
  });
});
