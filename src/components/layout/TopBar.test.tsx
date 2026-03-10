import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TopBar } from './TopBar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: {
      first_name: 'Ada',
      last_name: 'Admin',
    },
    role: 'admin',
    signOut: vi.fn(),
  }),
}));

vi.mock('./NotificationsBell', () => ({
  NotificationsBell: () => <div>NotificationsBell</div>,
}));

vi.mock('./ThemeToggle', () => ({
  ThemeToggle: () => <div>ThemeToggle</div>,
}));

vi.mock('./CommandPalette', () => ({
  CommandPalette: () => <div>CommandPalette</div>,
}));

describe('TopBar', () => {
  it('uses the exact shared route title for admin dashboard on mobile', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <TopBar />
      </MemoryRouter>,
    );

    expect(screen.getByText('Governance Dashboard')).toBeInTheDocument();
  });
});
