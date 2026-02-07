import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyPayslips, useEmployeeSalaryStructure } from '@/hooks/usePayroll';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { FileText, Eye, Wallet, TrendingUp } from 'lucide-react';
import { PayslipDetailDialog } from './PayslipDetailDialog';
import { Payslip } from '@/types/payroll';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/20 text-warning border-warning/30',
  paid: 'bg-success/20 text-success border-success/30',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

export function MyPayslips() {
  const { user } = useAuth();
  const { data: payslips, isLoading: payslipsLoading } = useMyPayslips();
  const { data: salary, isLoading: salaryLoading } = useEmployeeSalaryStructure(user?.id);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  if (payslipsLoading || salaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const latestPayslip = payslips?.[0];
  const totalEarningsThisYear = payslips
    ?.filter(p => new Date(p.created_at).getFullYear() === new Date().getFullYear())
    .reduce((sum, p) => sum + p.net_salary, 0) || 0;

  // Calculate total allowances if salary exists
  const totalAllowances = salary ? (
    Number(salary.housing_allowance || 0) +
    Number(salary.transport_allowance || 0) +
    Number(salary.meal_allowance || 0) +
    Number(salary.other_allowances || 0)
  ) : 0;

  return (
    <div className="space-y-6">
      {/* No salary structure warning */}
      {!salary && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-4">
            <p className="text-sm text-warning">
              Your salary structure has not been configured yet. Please contact HR for assistance.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Basic Salary</p>
                <p className="text-2xl font-bold">
                  {salary ? `RM ${Number(salary.basic_salary).toLocaleString()}` : '—'}
                </p>
                {totalAllowances > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    +RM {totalAllowances.toLocaleString()} allowances
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-primary/10 text-primary">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Net Pay</p>
                <p className="text-2xl font-bold">
                  {latestPayslip 
                    ? `RM ${Number(latestPayslip.net_salary).toLocaleString()}`
                    : '—'}
                </p>
                {latestPayslip && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(latestPayslip.created_at), 'MMM yyyy')}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-success">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">YTD Earnings</p>
                <p className="text-2xl font-bold">
                  RM {totalEarningsThisYear.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date().getFullYear()} total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-info/10 text-info">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Payslip History
          </CardTitle>
          <CardDescription>View and download your payslips</CardDescription>
        </CardHeader>
        <CardContent>
          {!payslips?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payslips available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payslips.map(payslip => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payslip.payroll_period?.name || 'Payslip'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payslip.payroll_period?.start_date && 
                          format(new Date(payslip.payroll_period.start_date), 'MMM d')} - {' '}
                        {payslip.payroll_period?.end_date && 
                          format(new Date(payslip.payroll_period.end_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">
                        RM {payslip.net_salary.toLocaleString()}
                      </p>
                      <Badge className={statusColors[payslip.status]}>
                        {payslip.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedPayslip(payslip)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDetailDialog
        payslip={selectedPayslip}
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
      />
    </div>
  );
}
