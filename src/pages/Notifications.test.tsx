import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import Notifications from '@/pages/Notifications';

const navigateMock = vi.fn();

const useNotificationHistoryMock = vi.fn();
const deleteNotificationsMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useUserNotifications: () => ({ unreadCount: 2 }),
  useDeleteNotifications: () => ({ deleteNotifications: deleteNotificationsMock, isDeleting: false }),
  useNotificationHistory: (params: unknown) => useNotificationHistoryMock(params),
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
    useNotificationHistoryMock.mockReturnValue({
      notifications: [
        {
          id: 'n-1',
          category: 'system',
          event_type: 'phase7_test_unread',
          title: 'System Alert',
          message: 'Unread test message',
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
    });
  });

  it('renders notification filters in header controls and preserves behavior', () => {
    render(<Notifications />);

    expect(screen.getByRole('region', { name: /Notification history filters/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Leave Workflow' }));
    expect(useNotificationHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'leave', readFilter: 'all' }),
    );

    fireEvent.click(screen.getByRole('option', { name: 'Unread' }));
    expect(useNotificationHistoryMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ category: 'leave', readFilter: 'unread' }),
    );
  });
});

