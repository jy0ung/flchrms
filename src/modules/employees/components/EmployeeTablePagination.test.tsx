import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmployeeTablePagination } from '@/modules/employees/components/EmployeeTablePagination';

describe('EmployeeTablePagination', () => {
  it('renders the current visible range and paging controls', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <EmployeeTablePagination
        currentPage={2}
        totalPages={4}
        pageSize={25}
        totalItems={88}
        visibleStart={26}
        visibleEnd={50}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    expect(screen.getByText('Showing 26-50 of 88 employees')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });
});
