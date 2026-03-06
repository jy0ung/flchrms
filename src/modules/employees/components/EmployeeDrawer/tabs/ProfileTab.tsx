import { Building2, Mail, Phone, Shield, UserRound, UserSquare2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppRole } from '@/types/hrms';

import type { DirectoryEmployee } from '../../EmployeeTable';

interface ProfileTabProps {
  employee: DirectoryEmployee;
  assignedRole: AppRole;
  managerName: string | null;
}

function Field({ label, value, icon: Icon }: { label: string; value: string | null | undefined; icon: typeof Mail }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium">{value || 'Not provided'}</p>
      </div>
    </div>
  );
}

export function ProfileTab({ employee, assignedRole, managerName }: ProfileTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Profile Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" value={`${employee.first_name} ${employee.last_name}`} icon={UserRound} />
          <Field label="Email" value={employee.email} icon={Mail} />
          <Field label="Phone" value={employee.phone} icon={Phone} />
          <Field label="Username" value={employee.username ? `@${employee.username}` : null} icon={Shield} />
          <Field label="Department" value={employee.department?.name || 'Unassigned'} icon={Building2} />
          <Field label="Manager" value={managerName} icon={UserSquare2} />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Directory Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee ID" value={employee.employee_id} icon={Shield} />
          <Field label="System Role" value={assignedRole.replace(/_/g, ' ')} icon={Shield} />
          <Field label="Status" value={employee.status.replace(/_/g, ' ')} icon={Shield} />
          <Field label="Job Title" value={employee.job_title} icon={UserRound} />
        </CardContent>
      </Card>
    </div>
  );
}
