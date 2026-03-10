import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Bell } from 'lucide-react';

import { TaskEmptyState } from './TaskEmptyState';

describe('TaskEmptyState', () => {
  it('renders the title, description, and action content', () => {
    render(
      <TaskEmptyState
        title="No alerts"
        description="Everything is quiet right now."
        action={<button type="button">Refresh</button>}
      />,
    );

    expect(screen.getByText('No alerts')).toBeInTheDocument();
    expect(screen.getByText('Everything is quiet right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });

  it('renders with a custom icon', () => {
    render(<TaskEmptyState title="No notifications" icon={Bell} />);

    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });
});
