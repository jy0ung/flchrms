import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { ModalScaffold } from '@/components/system';

describe('ModalScaffold', () => {
  it('uses the standard centered dialog layout by default', () => {
    render(
      <ModalScaffold
        open
        onOpenChange={vi.fn()}
        title="Standard modal"
        description="Centered dialog layout"
        body={<p>Body content</p>}
        footer={<Button type="button">Save</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');

    expect(dialog).toHaveAttribute('data-layout', 'dialog');
    expect(dialog).toHaveClass('left-[50%]');
    expect(footer).toHaveClass('-mx-5');
  });

  it('supports a full-screen mobile layout while preserving desktop modal chrome', () => {
    render(
      <ModalScaffold
        open
        onOpenChange={vi.fn()}
        title="Mobile task flow"
        description="Full-screen on smaller viewports"
        mobileLayout="full-screen"
        body={<p>Body content</p>}
        footer={<Button type="button">Continue</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const header = dialog.querySelector('[data-slot="dialog-header"]');
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');

    expect(dialog).toHaveAttribute('data-layout', 'full-screen');
    expect(dialog).toHaveClass('inset-0');
    expect(header).toHaveClass('text-left');
    expect(footer).toHaveClass('-mx-4');
  });
});
