import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  usePayrollPeriods, 
  usePayslips, 
  useCreatePayrollPeriod, 
  useGeneratePayslips,
  useUpdatePayrollPeriod 
} from '@/hooks/usePayroll';
import { format } from 'date-fns';
import { Plus, Play, CheckCircle, Eye, Calendar, Loader2 } from 'lucide-react';
import { CreatePayrollPeriodDialog } from './CreatePayrollPeriodDialog';
import { PayslipsListDialog } from './PayslipsListDialog';
import { PayrollPeriod } from '@/types/payroll';
import { DataTableShell, StatusBadge } from '@/components/system';

interface PayrollManagementProps {
  showCreateButton?: boolean;
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function PayrollManagement({
  showCreateButton = true,
  createDialogOpen,
  onCreateDialogOpenChange,
}: PayrollManagementProps = {}) {
  const { data: periods, isLoading } = usePayrollPeriods();
  const [internalShowCreateDialog, setInternalShowCreateDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const generatePayslips = useGeneratePayslips();
  const updatePeriod = useUpdatePayrollPeriod();
  const isCreateDialogOpen = createDialogOpen ?? internalShowCreateDialog;
  const setCreateDialogOpen = onCreateDialogOpenChange ?? setInternalShowCreateDialog;

  const handleGeneratePayslips = async (periodId: string) => {
    await generatePayslips.mutateAsync(periodId);
  };

  const handleCompletePeriod = async (periodId: string) => {
    await updatePeriod.mutateAsync({ id: periodId, status: 'completed' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DataTableShell
        title="Payroll Periods"
        description="Manage payroll runs and generate payslips"
        hasData={(periods?.length || 0) > 0}
        headerActions={
          showCreateButton ? (
            <Button className="h-9 w-full rounded-full sm:w-auto" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Payroll Period
            </Button>
          ) : null
        }
        emptyState={
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No payroll periods created yet</p>
            <Button
              variant="outline"
              className="mt-4 rounded-full"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create First Period
            </Button>
          </div>
        }
        content={
          periods?.length ? (
          <div className="space-y-4">
            {periods.map((period) => {
              const isGeneratingThisPeriod =
                generatePayslips.progress.periodId === period.id &&
                (generatePayslips.isPending ||
                  generatePayslips.progress.phase === 'completed' ||
                  generatePayslips.progress.phase === 'error');

              return (
                <div
                  key={period.id}
                  className="rounded-xl border border-border/60 p-4 shadow-sm transition-colors hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{period.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d, yyyy')}
                        </p>
                        {period.payment_date && (
                          <p className="text-xs text-muted-foreground">
                            Payment: {format(new Date(period.payment_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <StatusBadge status={period.status} />
                      {period.status === 'draft' && (
                        <Button
                          size="sm"
                          className="h-8 rounded-full"
                          onClick={() => handleGeneratePayslips(period.id)}
                          disabled={generatePayslips.isPending}
                        >
                          {isGeneratingThisPeriod ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Generate
                            </>
                          )}
                        </Button>
                      )}
                      {period.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full"
                          onClick={() => handleCompletePeriod(period.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full"
                        onClick={() => setSelectedPeriod(period)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Payslips
                      </Button>
                    </div>
                  </div>
                  {isGeneratingThisPeriod ? (
                    <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="truncate">
                          {generatePayslips.progress.error
                            ? `Generation failed: ${generatePayslips.progress.error}`
                            : generatePayslips.progress.message ?? 'Generating payslips...'}
                        </span>
                        <span className="font-medium tabular-nums text-foreground/80">
                          {Math.max(0, Math.min(100, Math.round(generatePayslips.progress.percent)))}%
                        </span>
                      </div>
                      <Progress value={generatePayslips.progress.percent} className="h-2" />
                      {generatePayslips.progress.totalEmployees > 0 ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Processed {generatePayslips.progress.processedEmployees}/
                          {generatePayslips.progress.totalEmployees} employees
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          ) : undefined
        }
      />

      <CreatePayrollPeriodDialog
        open={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <PayslipsListDialog
        period={selectedPeriod}
        open={!!selectedPeriod}
        onOpenChange={(open) => !open && setSelectedPeriod(null)}
      />
    </div>
  );
}
