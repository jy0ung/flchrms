import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Employees from '@/pages/Employees';

vi.mock('@/modules/employees', () => ({
  EmployeesPage: ({ entryContext }: { entryContext: string }) => <div>{`employees-page:${entryContext}`}</div>,
}));

describe('Employees route wrapper', () => {
  it('renders the canonical employee module page in module context', () => {
    render(<Employees />);

    expect(screen.getByText('employees-page:module')).toBeInTheDocument();
  });
});
