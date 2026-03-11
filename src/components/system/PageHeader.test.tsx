import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('uses aligned header layout by default', () => {
    const { container } = render(
      <PageHeader
        title="Employee Directory"
        description="Manage employee records."
        actionsSlot={<button type="button">Action</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Employee Directory' })).toBeInTheDocument();
    expect(screen.getByText('Manage employee records.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    expect(container.querySelector('header > div')).toHaveClass('lg:grid-cols-[minmax(0,1fr)_auto]');
  });

  it('supports the stacked layout variant', () => {
    const { container } = render(
      <PageHeader
        title="Notifications"
        layout="stacked"
        actionsSlot={<button type="button">Refresh</button>}
      />,
    );

    expect(container.querySelector('header > div')).toHaveClass('flex', 'flex-col');
  });
});
