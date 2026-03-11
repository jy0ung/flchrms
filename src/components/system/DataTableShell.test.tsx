import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DataTableShell } from '@/components/system/DataTableShell';

describe('DataTableShell', () => {
  it('renders content in flat surface mode', () => {
    render(
      <DataTableShell
        surfaceVariant="flat"
        title="Employees"
        description="Directory records in the current workspace."
        content={<div>Directory body</div>}
      />,
    );

    expect(screen.getByRole('region', { name: /employees/i })).toBeInTheDocument();
    expect(screen.getByText('Directory body')).toBeInTheDocument();
  });
});
