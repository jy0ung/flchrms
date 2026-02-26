import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Payslip } from '@/types/payroll';
import { format } from 'date-fns';
import { FileText, Calendar } from 'lucide-react';

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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payslip Details
            </DialogTitle>
            <Badge className={statusColors[payslip.status]}>
              {payslip.status}
            </Badge>
          </div>
          <DialogDescription>
            {payslip.payroll_period?.name || 'Payslip'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Period Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {payslip.payroll_period?.start_date && 
                format(new Date(payslip.payroll_period.start_date), 'MMM d')} - {' '}
              {payslip.payroll_period?.end_date && 
                format(new Date(payslip.payroll_period.end_date), 'MMM d, yyyy')}
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{payslip.working_days}</p>
              <p className="text-xs text-muted-foreground">Working Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{payslip.days_worked}</p>
              <p className="text-xs text-muted-foreground">Days Worked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{payslip.days_leave}</p>
              <p className="text-xs text-muted-foreground">Leave Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{payslip.days_absent}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
          </div>

          <Separator />

          {/* Earnings */}
          <div>
            <h4 className="font-semibold mb-3">Earnings</h4>
            <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Basic Salary</span>
                <span>{formatCurrency(payslip.basic_salary)}</span>
              </div>
              {Object.entries(allowances).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-muted-foreground capitalize">{key} Allowance</span>
                    <span>{formatCurrency(Number(value))}</span>
                  </div>
                )
              ))}
              {payslip.overtime_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overtime ({payslip.overtime_hours}h)</span>
                  <span>{formatCurrency(payslip.overtime_amount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex items-start justify-between gap-4 font-medium">
                <span>Gross Salary</span>
                <span>{formatCurrency(payslip.gross_salary)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          <div>
            <h4 className="font-semibold mb-3">Deductions</h4>
            <div className="space-y-2 rounded-xl border border-border/60 bg-background/70 p-4">
              {Object.entries(deductions).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-destructive">{formatDeductionCurrency(Number(value))}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex items-start justify-between gap-4 font-medium">
                <span>Total Deductions</span>
                <span className="text-destructive">{formatDeductionCurrency(payslip.total_deductions)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Net Salary */}
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-lg font-semibold">Net Salary</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(payslip.net_salary)}
              </span>
            </div>
          </div>

          {payslip.paid_at && (
            <p className="text-sm text-muted-foreground text-center">
              Paid on {format(new Date(payslip.paid_at), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
