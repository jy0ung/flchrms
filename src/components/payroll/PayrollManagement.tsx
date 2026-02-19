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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Payroll Period
        </Button>
      </div>

      {/* Payroll Periods */}
      <Card>
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
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{period.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(period.start_date), 'MMM d')} - {' '}
                        {format(new Date(period.end_date), 'MMM d, yyyy')}
                      </p>
                      {period.payment_date && (
                        <p className="text-xs text-muted-foreground">
                          Payment: {format(new Date(period.payment_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[period.status]}>
                      {period.status}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {period.status === 'draft' && (
                        <Button
                          size="sm"
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
                          onClick={() => handleCompletePeriod(period.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPeriod(period)}
                      >
                        <Eye className="w-4 h-4" />
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
