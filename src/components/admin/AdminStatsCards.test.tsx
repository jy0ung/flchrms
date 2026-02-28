import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AdminStatsCards,
  getAdminStatsDefaultLayoutState,
} from '@/components/admin/AdminStatsCards';

describe('AdminStatsCards', () => {
  it('renders provided admin statistics', () => {
    render(
      <AdminStatsCards
        stats={{
          totalEmployees: 42,
          admins: 2,
          hrUsers: 3,
          managers: 7,
        }}
      />,
    );

    expect(screen.getByText('Total Employees')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('HR Users')).toBeInTheDocument();
    expect(screen.getByText('Managers')).toBeInTheDocument();

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders compact density metric-first copy without verbose descriptions', () => {
    render(
      <AdminStatsCards
        density="compact"
        stats={{
          totalEmployees: 42,
          admins: 2,
          hrUsers: 3,
          managers: 7,
        }}
      />,
    );

    expect(screen.getByText('Active records in scope')).toBeInTheDocument();
    expect(screen.queryByText('Total active employee records visible to this admin scope.')).not.toBeInTheDocument();
  });

  it('renders layout tiles in customize mode and supports hide action', () => {
    const onLayoutStateChange = vi.fn();
    const onHideCard = vi.fn();

    render(
      <AdminStatsCards
        stats={{
          totalEmployees: 42,
          admins: 2,
          hrUsers: 3,
          managers: 7,
        }}
        mode="customize"
        visibleCardIds={['admins', 'managers']}
        layoutState={getAdminStatsDefaultLayoutState(['admins', 'managers'])}
        onLayoutStateChange={onLayoutStateChange}
        onHideCard={onHideCard}
      />,
    );

    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByText('Managers')).toBeInTheDocument();
    const hideButtons = screen.getAllByRole('button', { name: /Hide .* widget/i });
    expect(hideButtons).toHaveLength(2);

    fireEvent.click(hideButtons[0]);
    expect(onHideCard).toHaveBeenCalledTimes(1);
  });
});
