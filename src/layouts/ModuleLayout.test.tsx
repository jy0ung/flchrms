import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { ModuleLayout } from '@/layouts/ModuleLayout';

describe('ModuleLayout', () => {
  it('renders the header, toolbar controls, and content slots', () => {
    const onSearchChange = vi.fn();
    const onCreate = vi.fn();

    render(
      <ModuleLayout>
        <ModuleLayout.Header
          title="Employee Workspace"
          description="Manage employee records in context."
          metaSlot={<span>RBAC: HR</span>}
        />
        <ModuleLayout.Toolbar
          ariaLabel="Employee workspace controls"
          search={{
            value: '',
            onChange: onSearchChange,
            placeholder: 'Search employees...',
            ariaLabel: 'Search employees',
          }}
          actions={
            <Button type="button" onClick={onCreate}>
              Create employee
            </Button>
          }
        />
        <ModuleLayout.Content>
          <div>Directory content</div>
        </ModuleLayout.Content>
      </ModuleLayout>,
    );

    fireEvent.change(screen.getByRole('textbox', { name: /search employees/i }), {
      target: { value: 'Alicia' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create employee/i }));

    expect(screen.getByRole('heading', { name: /employee workspace/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /employee workspace controls/i })).toBeInTheDocument();
    expect(screen.getByText(/rbac: hr/i)).toBeInTheDocument();
    expect(screen.getByText(/directory content/i)).toBeInTheDocument();
    expect(onSearchChange).toHaveBeenCalledWith('Alicia');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders the optional detail drawer when open', () => {
    const onOpenChange = vi.fn();

    render(
      <ModuleLayout.DetailDrawer
        open
        onOpenChange={onOpenChange}
        title="Employee detail"
        description="Contextual workspace drawer"
      >
        <div>Drawer body</div>
      </ModuleLayout.DetailDrawer>,
    );

    expect(screen.getByText(/employee detail/i)).toBeInTheDocument();
    expect(screen.getByText(/drawer body/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('returns focus to the opener when the drawer closes', async () => {
    const trigger = document.createElement('button');
    trigger.textContent = 'Return focus';
    document.body.appendChild(trigger);
    trigger.focus();

    function Harness() {
      const [open, setOpen] = React.useState(true);

      return (
        <ModuleLayout.DetailDrawer
          open={open}
          onOpenChange={setOpen}
          title="Employee detail"
          description="Contextual workspace drawer"
          restoreFocusElement={trigger}
        >
          <div>Drawer body</div>
        </ModuleLayout.DetailDrawer>
      );
    }

    render(
      <Harness />,
    );

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });
});
