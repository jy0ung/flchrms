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
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 md:grid-cols-4">
        <TabsTrigger value="employees" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <Users className="w-4 h-4" />
          <span className="truncate">Employee Profiles</span>
        </TabsTrigger>
        <TabsTrigger value="departments" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <Building className="w-4 h-4" />
          <span className="truncate">Departments</span>
        </TabsTrigger>
        <TabsTrigger value="roles" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <Shield className="w-4 h-4" />
          <span className="truncate">Role Management</span>
        </TabsTrigger>
        <TabsTrigger value="leave-policies" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <FileText className="w-4 h-4" />
          <span className="truncate">Leave Policies</span>
        </TabsTrigger>
      </TabsList>

      {children}
    </Tabs>
  );
}
