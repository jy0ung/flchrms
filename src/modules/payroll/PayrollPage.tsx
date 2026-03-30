import { useEffect, useMemo, useState } from 'react';
import { Calculator, FileText, Plus, Settings, Wallet } from 'lucide-react';

import { MyPayslips } from '@/components/payroll/MyPayslips';
import { DeductionManagement } from '@/components/payroll/DeductionManagement';
import { PayrollManagement } from '@/components/payroll/PayrollManagement';
import { SalaryManagement } from '@/components/payroll/SalaryManagement';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useDeductionTypes,
  useEmployeeSalaryStructure,
  useMyPayslips,
  usePayrollPeriods,
  useSalaryStructures,
} from '@/hooks/usePayroll';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { canManagePayroll as canManagePayrollPermission } from '@/lib/permissions';
import { ContextChip } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import type { PayrollPageProps, PayrollWorkspaceTab } from './types';

const PAYROLL_HIDE_AMOUNTS_STORAGE_KEY = 'hrms.payroll.hideAmounts';

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `RM ${Number(value).toLocaleString()}`;
}

export function PayrollPage({ initialTab }: PayrollPageProps = {}) {
  usePageTitle('Payroll');

  const { role, user } = useAuth();
  const canManagePayroll = canManagePayrollPermission(role);
  const defaultTab: PayrollWorkspaceTab = canManagePayroll ? 'payroll' : 'payslips';
  const [activeTab, setActiveTab] = useState<PayrollWorkspaceTab>(initialTab ?? defaultTab);
  const [payrollCreateOpen, setPayrollCreateOpen] = useState(false);
  const [salaryCreateOpen, setSalaryCreateOpen] = useState(false);
  const [deductionCreateOpen, setDeductionCreateOpen] = useState(false);
  const [hidePayslipAmounts, setHidePayslipAmounts] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY) === '1';
  });

  const { data: payrollPeriods } = usePayrollPeriods();
  const { data: salaryStructures } = useSalaryStructures();
  const { data: deductionTypes } = useDeductionTypes();
  const { data: myPayslips } = useMyPayslips();
  const { data: employeeSalary } = useEmployeeSalaryStructure(user?.id);
  const hasEmployeePayrollData = Boolean(employeeSalary) || Boolean(myPayslips?.length);
  const showPayrollPrivacyToggle = activeTab === 'payslips' && hasEmployeePayrollData;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PAYROLL_HIDE_AMOUNTS_STORAGE_KEY, hidePayslipAmounts ? '1' : '0');
  }, [hidePayslipAmounts]);

  useEffect(() => {
    if (!canManagePayroll && activeTab !== 'payslips') {
      setActiveTab('payslips');
    }
  }, [activeTab, canManagePayroll]);

  const summaryItems = useMemo<SummaryRailItem[]>(() => {
    if (canManagePayroll) {
      const draftPeriods =
        payrollPeriods?.filter((period) => period.status === 'draft').length ?? 0;
      const processingPeriods =
        payrollPeriods?.filter((period) => period.status === 'processing').length ?? 0;

      return [
        {
          id: 'draft-periods',
          label: 'Draft periods',
          value: draftPeriods,
          helper: 'Payroll periods still waiting to be generated.',
        },
        {
          id: 'processing-periods',
          label: 'Processing',
          value: processingPeriods,
          helper: 'Runs currently being processed or ready to complete.',
        },
        {
          id: 'salary-structures',
          label: 'Salary structures',
          value: salaryStructures?.length ?? 0,
          helper: 'Active salary structures configured for employees.',
        },
        {
          id: 'deduction-types',
          label: 'Deduction types',
          value: deductionTypes?.length ?? 0,
          helper: 'Available statutory and company deduction rules.',
        },
      ];
    }

    const latestPayslip = myPayslips?.[0];
    const year = new Date().getFullYear();
    const ytdEarnings =
      myPayslips
        ?.filter((payslip) => new Date(payslip.created_at).getFullYear() === year)
        .reduce((sum, payslip) => sum + Number(payslip.net_salary), 0) ?? 0;

    return [
      {
        id: 'basic-salary',
        label: 'Current basic',
        value: employeeSalary
          ? formatCurrency(Number(employeeSalary.basic_salary))
          : 'Not configured',
        helper: employeeSalary
          ? 'Active base salary from your current salary structure.'
          : 'Your salary structure has not been configured yet.',
      },
      {
        id: 'latest-net-pay',
        label: 'Latest payslip',
        value: latestPayslip ? formatCurrency(Number(latestPayslip.net_salary)) : 'No payslip yet',
        helper: latestPayslip
          ? 'Most recent net salary visible in your payslip history.'
          : 'Your latest published payslip will appear here.',
      },
      {
        id: 'ytd-earnings',
        label: 'YTD earnings',
        value: myPayslips?.length ? formatCurrency(ytdEarnings) : 'No records yet',
        helper: myPayslips?.length
          ? `${year} earnings total based on your available payslips.`
          : `Published payslips will populate your ${year} total.`,
      },
      {
        id: 'payslips',
        label: 'Payslips',
        value: myPayslips?.length ?? 0,
        helper: 'Published payslips currently available to you.',
      },
    ];
  }, [canManagePayroll, deductionTypes, employeeSalary, myPayslips, payrollPeriods, salaryStructures]);

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

  const activeTabLabel =
    activeTab === 'payroll'
      ? 'Payroll runs'
      : activeTab === 'salaries'
        ? 'Salary structures'
        : activeTab === 'deductions'
          ? 'Deduction rules'
          : 'My payslips';

  const activeWorkspaceDescription =
    activeTab === 'payroll'
      ? 'Run payroll periods, monitor processing, and open generated payslips from one operational queue.'
      : activeTab === 'salaries'
        ? 'Review employee compensation records and keep salary structures current.'
        : activeTab === 'deductions'
          ? 'Maintain statutory and company deductions that shape each payroll run.'
          : 'Review the employee-facing payslip workspace without leaving payroll operations.';

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PayrollWorkspaceTab)} className="space-y-6">
      <ModuleLayout maxWidth="7xl" archetype="directory">
        <ModuleLayout.Header
          eyebrow="Workspace"
          title="Payroll"
          description={
            canManagePayroll
              ? 'Manage payroll runs, salary structures, deduction rules, and published payslips.'
              : 'Review your payslips and salary information as soon as payroll records are available.'
          }
          metaSlot={!canManagePayroll && !hasEmployeePayrollData ? (
            <ContextChip className="hidden sm:inline-flex">Payroll setup in progress</ContextChip>
          ) : undefined}
          actionsSlot={
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {headerAction ? (
                <Button type="button" className="h-9 rounded-full" onClick={headerAction.onClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  {headerAction.label}
                </Button>
              ) : null}
            </div>
          }
        />

        {canManagePayroll ? (
          <ModuleLayout.Toolbar
            surfaceVariant="flat"
            ariaLabel="Payroll workspace controls"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/40 p-1 lg:grid-cols-4">
              <TabsTrigger value="payroll" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Payroll</span>
              </TabsTrigger>
              <TabsTrigger value="salaries" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Salaries</span>
              </TabsTrigger>
              <TabsTrigger value="deductions" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Deductions</span>
              </TabsTrigger>
              <TabsTrigger value="payslips" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">My Payslips</span>
              </TabsTrigger>
            </TabsList>
          </ModuleLayout.Toolbar>
        ) : null}

        <ModuleLayout.Content>
          {canManagePayroll ? (
            <ModuleLayout.WorkspaceLead
              eyebrow="Active workspace"
              title={activeTabLabel}
              description={activeWorkspaceDescription}
              metaSlot={<ContextChip>Payroll operations</ContextChip>}
            >
              <SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />
            </ModuleLayout.WorkspaceLead>
          ) : null}

          {canManagePayroll ? (
            <>
              <TabsContent value="payroll" className="mt-0">
                <PayrollManagement
                  showCreateButton={false}
                  createDialogOpen={payrollCreateOpen}
                  onCreateDialogOpenChange={setPayrollCreateOpen}
                />
              </TabsContent>

              <TabsContent value="salaries" className="mt-0">
                <SalaryManagement
                  showCreateButton={false}
                  createDialogOpen={salaryCreateOpen}
                  onCreateDialogOpenChange={setSalaryCreateOpen}
                />
              </TabsContent>

              <TabsContent value="deductions" className="mt-0">
                <DeductionManagement
                  showCreateButton={false}
                  createDialogOpen={deductionCreateOpen}
                  onCreateDialogOpenChange={setDeductionCreateOpen}
                />
              </TabsContent>
            </>
          ) : null}

          <TabsContent value="payslips" className="mt-0">
            <MyPayslips
              hideAmounts={hidePayslipAmounts}
              onHideAmountsChange={setHidePayslipAmounts}
              showVisibilityToggle={showPayrollPrivacyToggle}
              showSummaryCards={false}
            />
          </TabsContent>

          {!canManagePayroll && hasEmployeePayrollData ? (
            <SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />
          ) : null}
        </ModuleLayout.Content>
      </ModuleLayout>
    </Tabs>
  );
}

export default PayrollPage;
