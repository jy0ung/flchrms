import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { addMonths, format } from 'date-fns';

import TeamCalendar from '@/pages/TeamCalendar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ role: 'manager' }),
}));

const createHolidayMutateAsync = vi.fn();
const createEventMutateAsync = vi.fn();
const deleteHolidayMutate = vi.fn();
const deleteEventMutate = vi.fn();

vi.mock('@/hooks/useCalendar', () => ({
  useCalendarEvents: () => ({ data: [], isLoading: false }),
  useHolidays: () => ({ data: [] }),
  useDepartmentEvents: () => ({ data: [] }),
  useCreateHoliday: () => ({ mutateAsync: createHolidayMutateAsync, isPending: false }),
  useDeleteHoliday: () => ({ mutate: deleteHolidayMutate, isPending: false }),
  useCreateDepartmentEvent: () => ({ mutateAsync: createEventMutateAsync, isPending: false }),
  useDeleteDepartmentEvent: () => ({ mutate: deleteEventMutate, isPending: false }),
}));

vi.mock('@/hooks/useEmployees', () => ({
  useDepartments: () => ({ data: [] }),
}));

describe('TeamCalendar SectionToolbar and dialog keyboard behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes month via toolbar controls', () => {
    render(<TeamCalendar />);

    expect(screen.getByRole('region', { name: /Calendar month controls/i })).toBeInTheDocument();
    expect(screen.getByText(format(new Date(), 'MMMM yyyy'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Next month/i }));

    expect(screen.getByText(format(addMonths(new Date(), 1), 'MMMM yyyy'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Today$/i }));

    expect(screen.getByText(format(new Date(), 'MMMM yyyy'))).toBeInTheDocument();
  });

  it('closes Add Event dialog on Escape and returns focus to trigger', async () => {
    render(<TeamCalendar />);

    const trigger = screen.getByRole('button', { name: /Add Event/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('heading', { name: /Add Department Event/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Add Department Event/i })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});

