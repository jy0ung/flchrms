import type { ReactNode } from 'react';
import { Building, FileText, Shield, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AdminTabsShellProps {
  defaultValue: 'employees' | 'departments' | 'roles' | 'leave-policies';
  children: ReactNode;
}

export function AdminTabsShell({ defaultValue, children }: AdminTabsShellProps) {
  return (
    <Tabs defaultValue={defaultValue} className="space-y-4">
      <TabsList>
        <TabsTrigger value="employees" className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          Employee Profiles
        </TabsTrigger>
        <TabsTrigger value="departments" className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          Departments
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Role Management
        </TabsTrigger>
        <TabsTrigger value="leave-policies" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Leave Policies
        </TabsTrigger>
      </TabsList>

      {children}
    </Tabs>
  );
}
