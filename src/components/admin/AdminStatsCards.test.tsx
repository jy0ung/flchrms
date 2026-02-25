import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';

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
});
