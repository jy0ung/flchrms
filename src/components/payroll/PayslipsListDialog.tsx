import { useDeferredValue, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayslips, useUpdatePayslipStatus } from '@/hooks/usePayroll';
import { PayrollPeriod, Payslip } from '@/types/payroll';
import { format } from 'date-fns';
import { Users, Search, Eye, CheckCircle, XCircle } from 'lucide-react';
import { PayslipDetailDialog } from './PayslipDetailDialog';
import { ModalScaffold, StatusBadge, TaskEmptyState } from '@/components/system';

interface PayslipsListDialogProps {
  period: PayrollPeriod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayslipsListDialog({ period, open, onOpenChange }: PayslipsListDialogProps) {
  const { data: payslips, isLoading } = usePayslips(period?.id);
  const updateStatus = useUpdatePayslipStatus();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  if (!period) return null;

  const filteredPayslips = payslips?.filter(p => {
    const name = `${p.employee?.first_name} ${p.employee?.last_name}`.toLowerCase();
    const empId = p.employee?.employee_id?.toLowerCase() || '';
    return name.includes(deferredSearch.toLowerCase()) || empId.includes(deferredSearch.toLowerCase());
  });

  const totalGross = payslips?.reduce((sum, p) => sum + p.gross_salary, 0) || 0;
  const totalNet = payslips?.reduce((sum, p) => sum + p.net_salary, 0) || 0;

  return (
    <>
      <ModalScaffold
        open={open}
        onOpenChange={onOpenChange}
        title={`${period.name} - Payslips`}
        description={`${format(new Date(period.start_date), 'MMM d')} - ${format(new Date(period.end_date), 'MMM d, yyyy')}`}
        maxWidth="4xl"
        contentClassName="max-h-[90vh] overflow-hidden"
        headerMeta={<Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        bodyClassName="space-y-4 flex-1 overflow-hidden flex flex-col"
        body={(
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/50 p-4 sm:grid-cols-3">
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
                <TaskEmptyState
                  title="No payslips found"
                  description="Generated payslips for this period will appear here once they are created."
                  icon={Users}
                  compact
                />
              ) : (
                filteredPayslips.map(payslip => (
                  <div
                    key={payslip.id}
                    className="rounded-lg border border-border p-3 shadow-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {payslip.employee?.first_name} {payslip.employee?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.employee?.employee_id} • {payslip.employee?.department?.name || 'No Dept'}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div className="mr-1 sm:text-right">
                          <p className="font-semibold">RM {payslip.net_salary.toLocaleString()}</p>
                          <StatusBadge status={payslip.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {payslip.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-success/30 text-success hover:bg-success/10"
                                onClick={() => updateStatus.mutate({ id: payslip.id, status: 'paid' })}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                                onClick={() => updateStatus.mutate({ id: payslip.id, status: 'cancelled' })}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setSelectedPayslip(payslip)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      />

      <PayslipDetailDialog
        payslip={selectedPayslip}
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
      />
    </>
  );
}
