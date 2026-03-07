import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BulkActionBar } from '@/components/bulk-actions/BulkActionBar';

const items = [
  { id: 'one', name: 'One' },
  { id: 'two', name: 'Two' },
];

describe('BulkActionBar', () => {
  it('renders selected count and executes actions for selected items only', () => {
    const onExecute = vi.fn();
    const onClearSelection = vi.fn();

    render(
      <BulkActionBar
        items={items}
        selectedIds={['one']}
        getItemId={(item) => item.id}
        actions={[
          {
            id: 'export',
            label: 'Export Selected',
            onExecute,
          },
        ]}
        onClearSelection={onClearSelection}
      />,
    );

    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Export Selected/i }));
    expect(onExecute).toHaveBeenCalledWith([items[0]]);

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(onClearSelection).toHaveBeenCalled();
  });

  it('does not render when nothing is selected', () => {
    const { container } = render(
      <BulkActionBar
        items={items}
        selectedIds={[]}
        getItemId={(item) => item.id}
        actions={[]}
        onClearSelection={vi.fn()}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
