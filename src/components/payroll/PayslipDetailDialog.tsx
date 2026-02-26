import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Payslip } from '@/types/payroll';
import { format } from 'date-fns';
import { Calendar, FileText, Shield, Wallet, X } from 'lucide-react';

interface PayslipDetailDialogProps {
  payslip: Payslip | null;
  hideAmounts?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  paid: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function PayslipDetailDialog({
  payslip,
  hideAmounts = false,
  open,
  onOpenChange,
}: PayslipDetailDialogProps) {
  if (!payslip) return null;

  const allowances = payslip.allowances_breakdown || {};
  const deductions = payslip.deductions_breakdown || {};
  const allowanceEntries = Object.entries(allowances).filter(([, value]) => Number(value) > 0);
  const deductionEntries = Object.entries(deductions).filter(([, value]) => Number(value) > 0);
  const periodLabel =
    payslip.payroll_period?.start_date && payslip.payroll_period?.end_date
      ? `${format(new Date(payslip.payroll_period.start_date), 'MMM d')} - ${format(
          new Date(payslip.payroll_period.end_date),
          'MMM d, yyyy',
        )}`
      : 'Payroll period';
  const formatCurrency = (value: number | null | undefined) => {
    if (hideAmounts) return 'RM •••••';
    return `RM ${Number(value || 0).toLocaleString()}`;
  };
  const formatDeductionCurrency = (value: number | null | undefined) => {
    if (hideAmounts) return '- RM •••••';
    return `- RM ${Number(value || 0).toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-3xl"
      >
        <DialogHeader className="space-y-4 pr-0">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl border border-border/60 bg-primary/10 p-2 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <DialogTitle className="pr-0 text-xl sm:text-2xl">Payslip Details</DialogTitle>
                </div>
                <DialogDescription className="mt-2">
                  {payslip.payroll_period?.name || 'Payslip'}
                </DialogDescription>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {periodLabel}
                  </span>
                  {hideAmounts ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                      <Shield className="h-3.5 w-3.5" />
                      Amounts hidden
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 self-start">
                <Badge className={statusColors[payslip.status]}>{payslip.status}</Badge>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="Close payslip details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Attendance Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card/80 p-3 text-center shadow-sm">
              <p className="text-xl font-semibold tabular-nums">{payslip.working_days}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Working Days</p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center shadow-sm">
              <p className="text-xl font-semibold tabular-nums text-success">{payslip.days_worked}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Days Worked</p>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-center shadow-sm">
              <p className="text-xl font-semibold tabular-nums text-warning">{payslip.days_leave}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Leave Days</p>
            </div>
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-center shadow-sm">
              <p className="text-xl font-semibold tabular-nums text-destructive">{payslip.days_absent}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">Absent</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Earnings */}
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/40 p-1.5 text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                </div>
                <h4 className="font-semibold">Earnings</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Basic Salary</span>
                  <span className="text-sm font-medium tabular-nums">{formatCurrency(payslip.basic_salary)}</span>
                </div>
                {allowanceEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background/50 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground capitalize">{key} Allowance</span>
                    <span className="text-sm tabular-nums">{formatCurrency(Number(value))}</span>
                  </div>
                ))}
                {payslip.overtime_amount > 0 ? (
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      Overtime ({payslip.overtime_hours}h)
                    </span>
                    <span className="text-sm tabular-nums">{formatCurrency(payslip.overtime_amount)}</span>
                  </div>
                ) : null}
                {allowanceEntries.length === 0 && payslip.overtime_amount <= 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                    No additional earnings for this payslip.
                  </div>
                ) : null}
                <Separator className="my-1" />
                <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-primary/5 px-3 py-2.5">
                  <span className="font-medium">Gross Salary</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(payslip.gross_salary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg border border-border/60 bg-muted/40 p-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <h4 className="font-semibold">Deductions</h4>
              </div>
              <div className="space-y-2">
                {deductionEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background/50 px-3 py-2"
                  >
                    <span className="text-sm text-muted-foreground">{key}</span>
                    <span className="text-sm tabular-nums text-destructive">
                      {formatDeductionCurrency(Number(value))}
                    </span>
                  </div>
                ))}
                {deductionEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                    No deductions applied.
                  </div>
                ) : null}
                <Separator className="my-1" />
                <div className="flex items-start justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                  <span className="font-medium">Total Deductions</span>
                  <span className="font-semibold tabular-nums text-destructive">
                    {formatDeductionCurrency(payslip.total_deductions)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-4 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net Salary</p>
                <p className="mt-1 text-lg font-semibold">Final payable amount for this period</p>
              </div>
              <span className="text-2xl font-bold text-primary sm:text-3xl">{formatCurrency(payslip.net_salary)}</span>
            </div>
          </div>

          {payslip.paid_at ? (
            <div className="rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-center text-sm text-muted-foreground">
              Paid on <span className="font-medium text-foreground">{format(new Date(payslip.paid_at), 'MMMM d, yyyy')}</span>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
