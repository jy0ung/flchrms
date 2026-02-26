import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState, type ComponentProps } from 'react';

import { AdminDepartmentDialogs } from '@/components/admin/AdminDepartmentDialogs';
import type { Department } from '@/types/hrms';

function makeProps(overrides: Partial<ComponentProps<typeof AdminDepartmentDialogs>> = {}): ComponentProps<typeof AdminDepartmentDialogs> {
  const selectedDepartment: Department = {
    id: 'dept-1',
    name: 'Operations',
    description: 'Ops department',
    manager_id: null,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  };

  return {
    createDepartmentDialogOpen: false,
    onCreateDepartmentDialogOpenChange: vi.fn(),
    newDepartmentName: '',
    onNewDepartmentNameChange: vi.fn(),
    newDepartmentDescription: '',
    onNewDepartmentDescriptionChange: vi.fn(),
    onCreateDepartment: vi.fn(),
    createDepartmentPending: false,
    editDepartmentDialogOpen: false,
    onEditDepartmentDialogOpenChange: vi.fn(),
    selectedDepartment,
    departmentForm: { name: 'Operations', description: 'Ops department' },
    onDepartmentFormChange: vi.fn(),
    onSaveDepartment: vi.fn(),
    updateDepartmentPending: false,
    deleteDepartmentDialogOpen: false,
    onDeleteDepartmentDialogOpenChange: vi.fn(),
    onDeleteDepartment: vi.fn(),
    deleteDepartmentPending: false,
    ...overrides,
  };
}

describe('Admin dialogs modal scaffold integration', () => {
  it('renders Create Department dialog with standardized section structure', () => {
    render(
      <AdminDepartmentDialogs
        {...makeProps({
          createDepartmentDialogOpen: true,
        })}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Create New Department/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Department Details/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Department/i })).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to trigger', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open Create Department
          </button>
          <AdminDepartmentDialogs
            {...makeProps({
              createDepartmentDialogOpen: open,
              onCreateDepartmentDialogOpenChange: setOpen,
            })}
          />
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: /Open Create Department/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('heading', { name: /Create New Department/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Create New Department/i })).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
  });
});
