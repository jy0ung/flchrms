import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { WorkspaceTransitionNotice } from '@/components/workspace/WorkspaceTransitionNotice';

describe('WorkspaceTransitionNotice', () => {
  it('renders compatibility messaging and destination action', () => {
    render(
      <MemoryRouter>
        <WorkspaceTransitionNotice
          title="Employee management now lives in the employee workspace"
          description="This admin route is retained for compatibility only."
          destination="/employees"
          actionLabel="Open Employee Workspace"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin route')).toBeInTheDocument();
    expect(screen.getByText('Workspace available')).toBeInTheDocument();
    expect(screen.getByText('Employee management now lives in the employee workspace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Employee Workspace/i })).toHaveAttribute('href', '/employees');
  });
});
