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
import { FileText, Calendar, Clock } from 'lucide-react';

interface PayslipDetailDialogProps {
  payslip: Payslip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  paid: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function PayslipDetailDialog({ payslip, open, onOpenChange }: PayslipDetailDialogProps) {
  if (!payslip) return null;

  const allowances = payslip.allowances_breakdown || {};
  const deductions = payslip.deductions_breakdown || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
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
          <div className="grid grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Basic Salary</span>
                <span>RM {payslip.basic_salary.toLocaleString()}</span>
              </div>
              {Object.entries(allowances).map(([key, value]) => (
                value > 0 && (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key} Allowance</span>
                    <span>RM {Number(value).toLocaleString()}</span>
                  </div>
                )
              ))}
              {payslip.overtime_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overtime ({payslip.overtime_hours}h)</span>
                  <span>RM {payslip.overtime_amount.toLocaleString()}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Gross Salary</span>
                <span>RM {payslip.gross_salary.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Deductions */}
          <div>
            <h4 className="font-semibold mb-3">Deductions</h4>
            <div className="space-y-2">
              {Object.entries(deductions).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-destructive">- RM {Number(value).toLocaleString()}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-medium">
                <span>Total Deductions</span>
                <span className="text-destructive">- RM {payslip.total_deductions.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Net Salary */}
          <div className="p-4 rounded-lg bg-primary/10">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Net Salary</span>
              <span className="text-2xl font-bold text-primary">
                RM {payslip.net_salary.toLocaleString()}
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
