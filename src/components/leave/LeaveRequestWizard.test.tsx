import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeaveRequestWizard } from '@/components/leave/LeaveRequestWizard';
import type { LeaveType } from '@/types/hrms';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';

// ── Fixtures ─────────────────────────────────────────────────────────────────
function makeLeaveType(overrides: Partial<LeaveType> = {}): LeaveType {
  return {
    id: 'lt-annual',
    name: 'Annual Leave',
    description: 'Standard annual leave',
    days_allowed: 14,
    is_paid: true,
    min_days: 0,
    requires_document: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

function makeBalance(overrides: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    leave_type_id: 'lt-annual',
    leave_type_name: 'Annual Leave',
    days_allowed: 14,
    days_used: 4,
    days_pending: 0,
    days_remaining: 10,
    annual_entitlement: 14,
    auto_accrued_days: 14,
    manual_adjustment_days: 0,
    entitled_days: 14,
    is_unlimited: false,
    cycle_start: '2026-01-01',
    cycle_end: '2026-12-31',
    source: 'test',
    ...overrides,
  };
}

const defaultProps = () => ({
  leaveTypes: [
    makeLeaveType(),
    makeLeaveType({
      id: 'lt-sick',
      name: 'Sick Leave',
      days_allowed: 10,
      requires_document: true,
    }),
  ],
  balances: [
    makeBalance(),
    makeBalance({
      leave_type_id: 'lt-sick',
      leave_type_name: 'Sick Leave',
      days_allowed: 10,
      days_used: 2,
      days_pending: 0,
      days_remaining: 8,
    }),
  ],
  onSubmit: vi.fn(),
  onPreview: vi.fn(async (data: { leave_type_id: string; start_date: string; end_date: string; days_count: number; reason?: string }) => ({
    can_submit: true,
    employee_id: 'emp-test',
    leave_type_id: data.leave_type_id,
    leave_type_name: data.leave_type_id === 'lt-sick' ? 'Sick Leave' : 'Annual Leave',
    start_date: data.start_date,
    end_date: data.end_date,
    requested_units: data.days_count,
    policy_version_id: 'pv-test',
    rule_unit: 'day' as const,
    requires_document: data.leave_type_id === 'lt-sick',
    allow_negative_balance: false,
    max_consecutive_days: null,
    min_notice_days: 0,
    is_unlimited: false,
    entitled_balance: 14,
    consumed_balance: 4,
    pending_balance: 0,
    available_balance: 10,
    balance_source: 'legacy_leave_requests',
    hard_errors: [],
    soft_warnings: [],
    reason: null,
  })),
  onUploadDocument: vi.fn().mockResolvedValue('https://storage.example.com/doc.pdf'),
  onCancel: vi.fn(),
  isPending: false,
  isPreviewPending: false,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find and click the wizard's navigation Next button (avoids calendar nav) */
function clickNext() {
  const buttons = screen.getAllByRole('button');
  const wizardNext = buttons.find((btn) => {
    const text = btn.textContent?.trim() ?? '';
    return text === 'Next' || text.startsWith('Next');
  });
  if (!wizardNext) throw new Error('Could not find wizard Next button');
  fireEvent.click(wizardNext);
}

/** Set date inputs by their type="date" attribute */
function setDates(container: HTMLElement, start: string, end: string) {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
  if (inputs.length < 2) throw new Error(`Expected 2 date inputs, found ${inputs.length}`);
  fireEvent.change(inputs[0], { target: { value: start } });
  fireEvent.change(inputs[1], { target: { value: end } });
}

/** Navigate from step 1 to step 2 */
function goToStep2() {
  fireEvent.click(screen.getByText('Annual Leave'));
  clickNext();
}

/** Navigate from step 1 to step 3 */
function goToStep3(container: HTMLElement, leaveTypeName = 'Annual Leave') {
  fireEvent.click(screen.getByText(leaveTypeName));
  clickNext();
  setDates(container, '2026-06-01', '2026-06-03');
  clickNext();
}

/** Navigate from step 1 to step 4 */
async function goToStep4(container: HTMLElement) {
  goToStep3(container);
  clickNext();
  await waitFor(() => {
    expect(screen.getByText('Review Your Request')).toBeInTheDocument();
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('LeaveRequestWizard', () => {
  describe('Step 1: Leave Type Selection', () => {
    it('renders all leave types with balance info', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);

      expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      expect(screen.getByText('10/14 days')).toBeInTheDocument();
      expect(screen.getByText('8/10 days')).toBeInTheDocument();
    });

    it('shows empty state when no leave types available', () => {
      render(<LeaveRequestWizard {...defaultProps()} leaveTypes={[]} />);
      expect(screen.getByText(/no leave types available/i)).toBeInTheDocument();
    });

    it('shows empty state when leaveTypes is undefined', () => {
      render(<LeaveRequestWizard {...defaultProps()} leaveTypes={undefined} />);
      expect(screen.getByText(/no leave types available/i)).toBeInTheDocument();
    });

    it('prevents advancing without selecting a type', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      clickNext();
      expect(screen.getByText(/please select a leave type/i)).toBeInTheDocument();
      expect(screen.getByText('Select Leave Type')).toBeInTheDocument();
    });

    it('advances to step 2 after selecting a leave type', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      fireEvent.click(screen.getByText('Annual Leave'));
      clickNext();
      // Step 2 content heading
      expect(container.querySelector('h3')?.textContent).toBe('Select Dates');
    });

    it('shows "Doc required" badge for types that require document', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      expect(screen.getByText('Doc required')).toBeInTheDocument();
    });

    it('shows advance notice badge when min_days > 0', () => {
      const types = [makeLeaveType({ min_days: 7 })];
      render(<LeaveRequestWizard {...defaultProps()} leaveTypes={types} />);
      expect(screen.getByText('7d notice')).toBeInTheDocument();
    });

    it('disables exhausted leave types', () => {
      const balances = [makeBalance({ days_remaining: 0 })];
      render(<LeaveRequestWizard {...defaultProps()} balances={balances} />);
      const annualButton = screen.getByText('Annual Leave').closest('button');
      expect(annualButton).toBeDisabled();
    });

    it('calls onCancel when Cancel button is clicked on step 1', () => {
      const props = defaultProps();
      render(<LeaveRequestWizard {...props} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(props.onCancel).toHaveBeenCalledOnce();
    });
  });

  describe('Step 2: Date Selection', () => {
    it('renders date inputs', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThanOrEqual(2);
    });

    it('prevents advancing without selecting dates', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      clickNext();
      expect(screen.getByText(/please select both start and end dates/i)).toBeInTheDocument();
    });

    it('shows Back button on step 2 that returns to step 1', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByText('Select Leave Type')).toBeInTheDocument();
    });

    it('shows days count summary when dates are set', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      setDates(container, '2026-06-01', '2026-06-05');
      // Check for "Calendar days" label with count displayed in the summary
      expect(screen.getByText('Calendar days')).toBeInTheDocument();
      expect(screen.getByText('Working days')).toBeInTheDocument();
    });

    it('shows balance warning when exceeding available days', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      setDates(container, '2026-06-01', '2026-06-15');
      expect(screen.getByText(/exceeds available balance/i)).toBeInTheDocument();
    });

    it('blocks advance when balance is exceeded', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      setDates(container, '2026-06-01', '2026-06-15');
      clickNext();
      expect(screen.queryByText(/insufficient balance/i)).not.toBeInTheDocument();
      expect(container.querySelector('h3')?.textContent).toBe('Additional Details');
    });
  });

  describe('Step 3: Details', () => {
    it('renders reason textarea', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep3(container);
      expect(screen.getByPlaceholderText(/describe the reason/i)).toBeInTheDocument();
    });

    it('shows character counter for reason', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep3(container);
      expect(screen.getByText('0/2000')).toBeInTheDocument();
    });

    it('shows document upload area', () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep3(container);
      expect(screen.getByText(/click or drag to upload/i)).toBeInTheDocument();
    });

    it('advances to review step without document for non-required types', async () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep3(container);
      clickNext();
      await waitFor(() => {
        expect(screen.getByText('Review Your Request')).toBeInTheDocument();
      });
    });

    it('blocks advance when document is required but not uploaded', () => {
      const types = [
        makeLeaveType({
          id: 'lt-sick',
          name: 'Sick Leave',
          days_allowed: 10,
          requires_document: true,
        }),
      ];
      const balances = [
        makeBalance({
          leave_type_id: 'lt-sick',
          leave_type_name: 'Sick Leave',
          days_allowed: 10,
          days_remaining: 8,
        }),
      ];
      const { container } = render(
        <LeaveRequestWizard {...defaultProps()} leaveTypes={types} balances={balances} />,
      );
      goToStep3(container, 'Sick Leave');
      clickNext();
      expect(screen.getByText(/requires a supporting document/i)).toBeInTheDocument();
    });

    it('shows "Required" badge for document when type requires it', () => {
      const types = [
        makeLeaveType({
          id: 'lt-sick',
          name: 'Sick Leave',
          days_allowed: 10,
          requires_document: true,
        }),
      ];
      const balances = [
        makeBalance({
          leave_type_id: 'lt-sick',
          leave_type_name: 'Sick Leave',
          days_allowed: 10,
          days_remaining: 8,
        }),
      ];
      const { container } = render(
        <LeaveRequestWizard {...defaultProps()} leaveTypes={types} balances={balances} />,
      );
      goToStep3(container, 'Sick Leave');
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  describe('Step 4: Review & Submit', () => {
    it('shows review summary with all details', async () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      await goToStep4(container);
      expect(screen.getByText('Review Your Request')).toBeInTheDocument();
      expect(screen.getByText('Annual Leave')).toBeInTheDocument();
      expect(screen.getByText(/3 calendar day/i)).toBeInTheDocument();
    });

    it('shows Submit Request button on step 4', async () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      await goToStep4(container);
      expect(screen.getByRole('button', { name: /submit request/i })).toBeInTheDocument();
    });

    it('calls onSubmit with correct payload on submit', async () => {
      const props = defaultProps();
      const { container } = render(<LeaveRequestWizard {...props} />);
      await goToStep4(container);

      fireEvent.click(screen.getByRole('button', { name: /submit request/i }));

      await waitFor(() => {
        expect(props.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            leave_type_id: 'lt-annual',
            start_date: '2026-06-01',
            end_date: '2026-06-03',
            days_count: 3,
          }),
        );
      });
    });

    it('shows "Submitting…" text when isPending is true', async () => {
      const props = defaultProps();
      const { container, rerender } = render(<LeaveRequestWizard {...props} />);
      await goToStep4(container);
      rerender(<LeaveRequestWizard {...props} isPending />);
      // The button should show "Submitting…" and be disabled
      const submitBtn = screen.getByRole('button', { name: /submitting/i });
      expect(submitBtn).toBeDisabled();
    });

    it('allows navigating back from review to edit', async () => {
      const { container } = render(<LeaveRequestWizard {...defaultProps()} />);
      await goToStep4(container);
      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(screen.getByText('Additional Details')).toBeInTheDocument();
    });
  });

  describe('Step indicator', () => {
    it('shows 4 step indicators', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  describe('Validation edge cases', () => {
    it('clears validation error when user selects a leave type after failed advance', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      clickNext();
      expect(screen.getByText(/please select a leave type/i)).toBeInTheDocument();

      fireEvent.click(screen.getByText('Annual Leave'));
      expect(screen.queryByText(/please select a leave type/i)).not.toBeInTheDocument();
    });

    it('clears validation error when navigating back', () => {
      render(<LeaveRequestWizard {...defaultProps()} />);
      goToStep2();
      clickNext();
      expect(screen.getByText(/please select both start and end dates/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /back/i }));
      expect(
        screen.queryByText(/please select both start and end dates/i),
      ).not.toBeInTheDocument();
    });
  });
});
