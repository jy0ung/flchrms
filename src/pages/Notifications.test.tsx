import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import Notifications from '@/pages/Notifications';

const navigateMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

const useNotificationHistoryMock = vi.fn();
let mockIsMobile = false;

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotificationHistory: (params: unknown) => useNotificationHistoryMock(params),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

vi.mock('@/components/layout/ShellNotificationsProvider', () => ({
  useOptionalShellNotifications: () => ({ unreadCount: 2 }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('@/components/ui/select', () => {
  const SelectContext = React.createContext<{
    value: string;
    onValueChange: (next: string) => void;
  } | null>(null);

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (next: string) => void;
    children: React.ReactNode;
  }) {
    return <SelectContext.Provider value={{ value, onValueChange }}>{children}</SelectContext.Provider>;
  }

  function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
      <button type="button" role="combobox" className={className}>
        {children}
      </button>
    );
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext);
    return <span>{context?.value || placeholder || ''}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) {
    const context = React.useContext(SelectContext);
    if (!context) return null;
    return (
      <button type="button" role="option" onClick={() => context.onValueChange(value)}>
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

describe('Notifications page header control relocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMobile = false;
    useNotificationHistoryMock.mockReturnValue({
      notifications: [
        {
          id: 'n-1',
          category: 'system',
          metadata: { event_type: 'phase7_test_unread' },
          title: 'System Alert',
          body: 'Unread test message',
          created_at: '2026-02-27T00:00:00Z',
          read_at: null,
        },
      ],
      totalCount: 1,
      totalPages: 1,
      isLoading: false,
      isFetching: false,
      isMarkingRead: false,
      isMarkingUnread: false,
      refetch: vi.fn(),
      markNotificationRead: vi.fn(),
      markNotificationUnread: vi.fn(),
      markAllNotificationsRead: vi.fn(),
      deleteReadNotifications: vi.fn(),
      isDeletingReadNotifications: false,
    });
  });

  it('keeps the inbox primary and hides maintenance tools until requested', () => {
    render(<Notifications />);

    expect(screen.getAllByText('Unread').length).toBeGreaterThan(0);
    expect(screen.getByText('In view')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Phase 7 test unread')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Notification history filters/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Inbox$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Inbox maintenance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark All Read/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show inbox tools/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Notification settings/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Inbox$/i }).compareDocumentPosition(
        screen.getByRole('heading', { name: /Inbox maintenance/i }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Show inbox tools/i }));

    expect(screen.getByRole('button', { name: /Hide inbox tools/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notification settings/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Leave Workflow' }));
    expect(useNotificationHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'leave', readFilter: 'all' }),
    );

    fireEvent.click(screen.getByRole('option', { name: 'Unread' }));
    expect(useNotificationHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'leave', readFilter: 'unread' }),
    );
  });

  it('makes a leave notification card the primary navigation target', async () => {
    const markNotificationRead = vi.fn().mockResolvedValue(undefined);
    const markNotificationUnread = vi.fn().mockResolvedValue(undefined);
    useNotificationHistoryMock.mockReturnValue({
      notifications: [
        {
          id: 'n-2',
          category: 'leave',
          metadata: { event_type: 'leave_request_submitted' },
          title: 'Leave request submitted',
          body: 'A leave request is waiting in the workflow queue.',
          created_at: '2026-02-27T00:00:00Z',
          read_at: null,
        },
      ],
      totalCount: 1,
      totalPages: 1,
      isLoading: false,
      isFetching: false,
      isMarkingRead: false,
      isMarkingUnread: false,
      refetch: vi.fn(),
      markNotificationRead,
      markNotificationUnread,
      markAllNotificationsRead: vi.fn(),
      deleteReadNotifications: vi.fn(),
      isDeletingReadNotifications: false,
    });

    render(<Notifications />);

    fireEvent.click(screen.getByRole('button', { name: /Open leave workflow for Leave request submitted/i }));
    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith('n-2'));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/leave'));
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Notification marked as read',
      expect.objectContaining({
        description: 'Leave request submitted',
        action: expect.objectContaining({ label: 'Undo' }),
      }),
    );

    const toastCall = toastSuccessMock.mock.calls[0]?.[1] as { action?: { onClick?: () => void } } | undefined;
    toastCall?.action?.onClick?.();

    await waitFor(() => expect(markNotificationUnread).toHaveBeenCalledWith('n-2'));
  });

  it('compresses summary and actions on mobile while keeping the inbox primary', () => {
    mockIsMobile = true;

    render(<Notifications />);

    expect(screen.queryByText('Current View')).not.toBeInTheDocument();
    expect(screen.getByText('2 unread')).toBeInTheDocument();
    expect(screen.getByText('Unread first')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open inbox actions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Inbox$/i })).toBeInTheDocument();
  });
});
