import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { MyPayslips } from '@/components/payroll/MyPayslips';
import { PayrollManagement } from '@/components/payroll/PayrollManagement';
import { SalaryManagement } from '@/components/payroll/SalaryManagement';
import { DeductionManagement } from '@/components/payroll/DeductionManagement';
import { Wallet, FileText, Settings, Calculator } from 'lucide-react';

export default function Payroll() {
  const { role } = useAuth();
  const isHRorAdmin = role === 'hr' || role === 'admin';
  const [activeTab, setActiveTab] = useState(isHRorAdmin ? 'payroll' : 'payslips');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">
            {isHRorAdmin 
              ? 'Manage salaries, process payroll, and generate payslips'
              : 'View your payslips and salary information'}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 max-w-2xl">
          {isHRorAdmin && (
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

        {isHRorAdmin && (
          <>
            <TabsContent value="payroll" className="space-y-6">
              <PayrollManagement />
            </TabsContent>

            <TabsContent value="salaries" className="space-y-6">
              <SalaryManagement />
            </TabsContent>

            <TabsContent value="deductions" className="space-y-6">
              <DeductionManagement />
            </TabsContent>
          </>
        )}

        <TabsContent value="payslips" className="space-y-6">
          <MyPayslips />
        </TabsContent>
      </Tabs>
    </div>
  );
}
