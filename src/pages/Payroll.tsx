import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { MyPayslips } from '@/components/payroll/MyPayslips';
import { PayrollManagement } from '@/components/payroll/PayrollManagement';
import { SalaryManagement } from '@/components/payroll/SalaryManagement';
import { DeductionManagement } from '@/components/payroll/DeductionManagement';
import { Wallet, FileText, Settings, Calculator, Plus, Eye, EyeOff } from 'lucide-react';
import { canManagePayroll as canManagePayrollPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { AppPageContainer, PageHeader } from '@/components/system';

const PAYROLL_HIDE_AMOUNTS_STORAGE_KEY = 'hrms.payroll.hideAmounts';

export default function Payroll() {
  usePageTitle('Payroll');
  const { role } = useAuth();
  const canManagePayroll = canManagePayrollPermission(role);
  const [activeTab, setActiveTab] = useState(canManagePayroll ? 'payroll' : 'payslips');
  const [payrollCreateOpen, setPayrollCreateOpen] = useState(false);
  const [salaryCreateOpen, setSalaryCreateOpen] = useState(false);
  const [deductionCreateOpen, setDeductionCreateOpen] = useState(false);
  const [hidePayslipAmounts, setHidePayslipAmounts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY, hidePayslipAmounts ? '1' : '0');
  }, [hidePayslipAmounts]);

  const headerAction = canManagePayroll
    ? activeTab === 'payroll'
      ? {
          label: 'New Payroll Period',
          onClick: () => setPayrollCreateOpen(true),
        }
      : activeTab === 'salaries'
        ? {
            label: 'Add Salary Structure',
            onClick: () => setSalaryCreateOpen(true),
          }
        : activeTab === 'deductions'
          ? {
              label: 'Add Deduction Type',
              onClick: () => setDeductionCreateOpen(true),
            }
          : null
    : null;

  const isPayslipsTab = activeTab === 'payslips';

  return (
    <AppPageContainer maxWidth="7xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <PageHeader
          title="Payroll"
          description={
            canManagePayroll
              ? 'Manage salaries, process payroll, and generate payslips'
              : 'View your payslips and salary information'
          }
          actionsSlot={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              {isPayslipsTab ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 w-full rounded-full sm:w-auto"
                  onClick={() => setHidePayslipAmounts((current) => !current)}
                  aria-pressed={hidePayslipAmounts}
                >
                  {hidePayslipAmounts ? (
                    <EyeOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Eye className="mr-2 h-4 w-4" />
                  )}
                  {hidePayslipAmounts ? 'Show salary amounts' : 'Hide salary amounts'}
                </Button>
              ) : null}
              {headerAction ? (
                <Button className="h-9 w-full rounded-full sm:w-auto sm:self-start" onClick={headerAction.onClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  {headerAction.label}
                </Button>
              ) : null}
            </div>
          }
          tabsSlot={
            <TabsList
              className={`grid h-auto w-full rounded-lg bg-muted/40 p-1 ${
                canManagePayroll ? 'grid-cols-2 lg:grid-cols-4 max-w-3xl' : 'grid-cols-1 max-w-sm'
              }`}
            >
              {canManagePayroll && (
                <>
                  <TabsTrigger value="payroll" className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Payroll</span>
                  </TabsTrigger>
                  <TabsTrigger value="salaries" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    <span className="hidden sm:inline">Salaries</span>
                  </TabsTrigger>
                  <TabsTrigger value="deductions" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Deductions</span>
                  </TabsTrigger>
                </>
              )}
              <TabsTrigger value="payslips" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">My Payslips</span>
              </TabsTrigger>
            </TabsList>
          }
        />

          {canManagePayroll && (
            <>
              <TabsContent value="payroll" className="space-y-4">
                <PayrollManagement
                  showCreateButton={false}
                  createDialogOpen={payrollCreateOpen}
                  onCreateDialogOpenChange={setPayrollCreateOpen}
                />
              </TabsContent>

              <TabsContent value="salaries" className="space-y-4">
                <SalaryManagement
                  showCreateButton={false}
                  createDialogOpen={salaryCreateOpen}
                  onCreateDialogOpenChange={setSalaryCreateOpen}
                />
              </TabsContent>

              <TabsContent value="deductions" className="space-y-4">
                <DeductionManagement
                  showCreateButton={false}
                  createDialogOpen={deductionCreateOpen}
                  onCreateDialogOpenChange={setDeductionCreateOpen}
                />
              </TabsContent>
            </>
          )}

          <TabsContent value="payslips" className="space-y-4">
            <MyPayslips
              hideAmounts={hidePayslipAmounts}
              onHideAmountsChange={setHidePayslipAmounts}
              showVisibilityToggle={false}
            />
          </TabsContent>
      </Tabs>
    </AppPageContainer>
  );
}
