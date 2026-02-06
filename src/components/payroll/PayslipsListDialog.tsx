import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayslips, useUpdatePayslipStatus } from '@/hooks/usePayroll';
import { PayrollPeriod, Payslip } from '@/types/payroll';
import { format } from 'date-fns';
import { Users, Search, Eye, CheckCircle, XCircle } from 'lucide-react';
import { PayslipDetailDialog } from './PayslipDetailDialog';

interface PayslipsListDialogProps {
  period: PayrollPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  paid: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function PayslipsListDialog({ period, open, onOpenChange }: PayslipsListDialogProps) {
  const { data: payslips, isLoading } = usePayslips(period?.id);
  const updateStatus = useUpdatePayslipStatus();
  const [search, setSearch] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  if (!period) return null;

  const filteredPayslips = payslips?.filter(p => {
    const name = `${p.employee?.first_name} ${p.employee?.last_name}`.toLowerCase();
    const empId = p.employee?.employee_id?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || empId.includes(search.toLowerCase());
  });

  const totalGross = payslips?.reduce((sum, p) => sum + p.gross_salary, 0) || 0;
  const totalNet = payslips?.reduce((sum, p) => sum + p.net_salary, 0) || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {period.name} - Payslips
            </DialogTitle>
            <DialogDescription>
              {format(new Date(period.start_date), 'MMM d')} - {' '}
              {format(new Date(period.end_date), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
              <div className="text-center">
                <p className="text-2xl font-bold">{payslips?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">RM {totalGross.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Gross</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">RM {totalNet.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Net</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Payslips List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)
              ) : !filteredPayslips?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payslips found</p>
                </div>
              ) : (
                filteredPayslips.map(payslip => (
                  <div
                    key={payslip.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          {payslip.employee?.first_name} {payslip.employee?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.employee?.employee_id} • {payslip.employee?.department?.name || 'No Dept'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">RM {payslip.net_salary.toLocaleString()}</p>
                        <Badge className={statusColors[payslip.status]}>
                          {payslip.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {payslip.status === 'pending' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-success hover:text-success"
                              onClick={() => updateStatus.mutate({ id: payslip.id, status: 'paid' })}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => updateStatus.mutate({ id: payslip.id, status: 'cancelled' })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => setSelectedPayslip(payslip)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PayslipDetailDialog
        payslip={selectedPayslip}
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
      />
    </>
  );
}
