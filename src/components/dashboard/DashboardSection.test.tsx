import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardSection } from './DashboardSection';

describe('DashboardSection', () => {
  it('renders a compact aligned section header with optional actions', () => {
    render(
      <DashboardSection
        eyebrow="Act now"
        title="Required Actions"
        description="Items that need attention now."
        variant="priority"
        actions={<button type="button">Open all</button>}
      >
        <div>Section content</div>
      </DashboardSection>,
    );

    expect(screen.getByText('Act now')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Required Actions' })).toBeInTheDocument();
    expect(screen.getByText('Items that need attention now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open all' })).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });
});
