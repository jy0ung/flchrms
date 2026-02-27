import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from 'lucide-react';

import { LayoutTile } from '@/components/system/LayoutTile';

describe('LayoutTile enterprise variant', () => {
  it('renders compact enterprise controls without semantic size metadata', () => {
    const onHide = vi.fn();
    const onKeyboardResize = vi.fn();
    const onKeyboardReorder = vi.fn();

    render(
      <LayoutTile
        id="criticalInsights"
        title="Critical Insights"
        description="Risk and exception signals for operational leadership."
        icon={Calendar}
        width={8}
        widthSteps={[4, 8, 12]}
        onWidthChange={vi.fn()}
        onHide={onHide}
        variant="enterprise"
        onKeyboardResize={onKeyboardResize}
        onKeyboardReorder={onKeyboardReorder}
      />,
    );

    expect(screen.queryByText(/Size\s+[SML]/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/8\/12/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide Critical Insights widget/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Resize Critical Insights widget/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hide Critical Insights widget/i }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard reorder and keyboard resize shortcuts', () => {
    const onKeyboardResize = vi.fn();
    const onKeyboardReorder = vi.fn();

    render(
      <LayoutTile
        id="teamSnapshot"
        title="Team Snapshot"
        description="Headcount and attendance signal."
        width={8}
        widthSteps={[4, 8, 12]}
        onWidthChange={vi.fn()}
        variant="enterprise"
        onKeyboardResize={onKeyboardResize}
        onKeyboardReorder={onKeyboardReorder}
      />,
    );

    const dragButton = screen.getByRole('button', { name: /Reorder Team Snapshot widget/i });
    fireEvent.keyDown(dragButton, { key: 'ArrowUp' });
    fireEvent.keyDown(dragButton, { key: 'ArrowDown' });
    expect(onKeyboardReorder).toHaveBeenNthCalledWith(1, 'up');
    expect(onKeyboardReorder).toHaveBeenNthCalledWith(2, 'down');

    const resizeButton = screen.getByRole('button', { name: /Resize Team Snapshot widget/i });
    fireEvent.keyDown(resizeButton, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(resizeButton, { key: 'ArrowRight', shiftKey: true });
    expect(onKeyboardResize).toHaveBeenNthCalledWith(1, 'shrink');
    expect(onKeyboardResize).toHaveBeenNthCalledWith(2, 'expand');
  });
});
