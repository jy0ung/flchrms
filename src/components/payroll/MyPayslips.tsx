import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMyPayslips, useEmployeeSalaryStructure } from '@/hooks/usePayroll';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { AlertTriangle, FileText, Eye, EyeOff, Wallet } from 'lucide-react';
import { PayslipDetailDialog } from './PayslipDetailDialog';
import { Payslip } from '@/types/payroll';
import { CardHeaderStandard, StatusBadge, TaskEmptyState } from '@/components/system';

const PAYROLL_HIDE_AMOUNTS_STORAGE_KEY = 'hrms.payroll.hideAmounts';

interface MyPayslipsProps {
  hideAmounts?: boolean;
  onHideAmountsChange?: (value: boolean) => void;
  showVisibilityToggle?: boolean;
  showSummaryCards?: boolean;
}

export function MyPayslips({
  hideAmounts: controlledHideAmounts,
  onHideAmountsChange,
  showVisibilityToggle = true,
  showSummaryCards = true,
}: MyPayslipsProps = {}) {
  const { user } = useAuth();
  const { data: payslips, isLoading: payslipsLoading } = useMyPayslips();
  const { data: salary, isLoading: salaryLoading } = useEmployeeSalaryStructure(user?.id);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [internalHideAmounts, setInternalHideAmounts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY) === '1';
  });
  const hideAmounts = controlledHideAmounts ?? internalHideAmounts;
  const setHideAmounts = onHideAmountsChange ?? setInternalHideAmounts;
  const hasPayslips = Boolean(payslips?.length);
  const hasSalary = Boolean(salary);

  useEffect(() => {
    if (controlledHideAmounts !== undefined) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY, hideAmounts ? '1' : '0');
  }, [controlledHideAmounts, hideAmounts]);

  if (payslipsLoading || salaryLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
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

  const formatCurrency = (value: number | null | undefined) => {
    if (hideAmounts) return 'RM •••••';
    if (value === null || value === undefined) return '—';
    return `RM ${Number(value).toLocaleString()}`;
  };

  if (!hasSalary && !hasPayslips) {
    return (
      <TaskEmptyState
        title="Payroll setup in progress"
        description="Your salary structure and first payslip are not available yet. Once payroll is configured and published, this page will show your current pay and payslip history."
        icon={Wallet}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showVisibilityToggle ? (
        <div className="flex justify-end">
          <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-sm sm:w-auto sm:justify-start">
            <div className="flex min-w-0 items-center gap-3">
              {hideAmounts ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="hide-payroll-amounts" className="text-sm">
                Hide salary amounts
              </Label>
            </div>
            <Switch
              id="hide-payroll-amounts"
              checked={hideAmounts}
              onCheckedChange={setHideAmounts}
            />
          </div>
        </div>
      ) : null}

      {/* No salary structure warning */}
      {!hasSalary && (
        <Card className="border-warning/40 bg-warning/5 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-background p-2 text-warning" aria-hidden="true">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Salary structure not configured</p>
                <p className="text-sm text-foreground/80">
                  Your salary structure has not been configured yet. Please contact HR for assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showSummaryCards ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border shadow-sm">
            <CardHeaderStandard
              title="Basic Salary"
              description={totalAllowances > 0
                ? hideAmounts
                  ? '+RM ••••• allowances'
                  : `+RM ${totalAllowances.toLocaleString()} allowances`
                : undefined}
              className="p-4 pb-2"
              titleClassName="text-base font-semibold"
              descriptionClassName="text-xs"
            />
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-2xl font-bold">
                {salary ? formatCurrency(Number(salary.basic_salary)) : '—'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeaderStandard
              title="Last Net Pay"
              description={latestPayslip ? format(new Date(latestPayslip.created_at), 'MMM yyyy') : undefined}
              className="p-4 pb-2"
              titleClassName="text-base font-semibold"
              descriptionClassName="text-xs"
            />
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-2xl font-bold">
                {latestPayslip
                  ? formatCurrency(Number(latestPayslip.net_salary))
                  : '—'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeaderStandard
              title="YTD Earnings"
              description={`${new Date().getFullYear()} total`}
              className="p-4 pb-2"
              titleClassName="text-base font-semibold"
              descriptionClassName="text-xs"
            />
            <CardContent className="px-4 pb-4 pt-0">
              <p className="text-2xl font-bold">
                {formatCurrency(totalEarningsThisYear)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Payslips List */}
      <Card className="border-border shadow-sm">
        <CardHeaderStandard
          title="Payslip History"
          description="Payslip records and download access."
          className="p-4 pb-2"
        />
        <CardContent>
          {!hasPayslips ? (
            <TaskEmptyState
              title="No payslips available yet"
              description={
                hasSalary
                  ? 'Your salary details are configured. Published payroll periods will appear here once your first payslip is generated.'
                  : 'Published payroll periods will appear here once payslips are generated for your account.'
              }
              icon={FileText}
            />
          ) : (
            <div className="space-y-3">
              {payslips.map(payslip => (
                <div
                  key={payslip.id}
                  className="rounded-lg border border-border p-4 shadow-sm transition-colors hover:bg-muted/40"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {payslip.payroll_period?.name || 'Payslip'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payslip.payroll_period?.start_date &&
                            format(new Date(payslip.payroll_period.start_date), 'MMM d')} -{' '}
                          {payslip.payroll_period?.end_date &&
                            format(new Date(payslip.payroll_period.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="sm:text-right">
                        <p className="font-semibold">
                          {formatCurrency(payslip.net_salary)}
                        </p>
                        <StatusBadge status={payslip.status} />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setSelectedPayslip(payslip)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipDetailDialog
        payslip={selectedPayslip}
        hideAmounts={hideAmounts}
        open={!!selectedPayslip}
        onOpenChange={(open) => !open && setSelectedPayslip(null)}
      />
    </div>
  );
}
