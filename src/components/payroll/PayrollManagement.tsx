import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  usePayrollPeriods, 
  usePayslips, 
  useCreatePayrollPeriod, 
  useGeneratePayslips,
  useUpdatePayrollPeriod 
} from '@/hooks/usePayroll';
import { format } from 'date-fns';
import { Plus, Play, CheckCircle, Eye, Calendar, Users } from 'lucide-react';
import { CreatePayrollPeriodDialog } from './CreatePayrollPeriodDialog';
import { PayslipsListDialog } from './PayslipsListDialog';
import { PayrollPeriod } from '@/types/payroll';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  processing: 'bg-warning/20 text-warning border-warning/30',
  completed: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function PayrollManagement() {
  const { data: periods, isLoading } = usePayrollPeriods();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const generatePayslips = useGeneratePayslips();
  const updatePeriod = useUpdatePayrollPeriod();

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
      {/* Actions */}
      <div className="flex justify-end">
        <Button className="rounded-full w-full sm:w-auto" onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Payroll Period
        </Button>
      </div>

      {/* Payroll Periods */}
      <Card className="card-stat border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Payroll Periods
          </CardTitle>
          <CardDescription>Manage payroll runs and generate payslips</CardDescription>
        </CardHeader>
        <CardContent>
          {!periods?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payroll periods created yet</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowCreateDialog(true)}
              >
                Create First Period
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {periods.map(period => (
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
                          {format(new Date(period.start_date), 'MMM d')} -{' '}
                          {format(new Date(period.end_date), 'MMM d, yyyy')}
                        </p>
                        {period.payment_date && (
                          <p className="text-xs text-muted-foreground">
                            Payment: {format(new Date(period.payment_date), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <Badge className={statusColors[period.status]}>
                        {period.status}
                      </Badge>
                      {period.status === 'draft' && (
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => handleGeneratePayslips(period.id)}
                          disabled={generatePayslips.isPending}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Generate
                        </Button>
                      )}
                      {period.status === 'processing' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full"
                          onClick={() => handleCompletePeriod(period.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setSelectedPeriod(period)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Payslips
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePayrollPeriodDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <PayslipsListDialog
        period={selectedPeriod}
        open={!!selectedPeriod}
        onOpenChange={(open) => !open && setSelectedPeriod(null)}
      />
    </div>
  );
}
