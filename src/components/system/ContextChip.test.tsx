import { render, screen } from '@testing-library/react';

import { ContextChip } from './ContextChip';

describe('ContextChip', () => {
  it('renders non-interactive context text without button semantics', () => {
    render(<ContextChip>Active view: My payslips</ContextChip>);

    expect(screen.getByText('Active view: My payslips')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /active view/i })).not.toBeInTheDocument();
  });
});
