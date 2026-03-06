import { BriefcaseBusiness, CalendarDays, CreditCard, MapPin, Shield, UserSquare2 } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmployeeExtendedProfile } from '@/hooks/useEmployeeLifecycle';

import type { DirectoryEmployee } from '../../EmployeeTable';

interface EmploymentTabProps {
  employee: DirectoryEmployee;
  extendedProfile?: EmployeeExtendedProfile;
  managerName: string | null;
  showSensitiveSection: boolean;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  try {
    return format(new Date(value), 'MMM d, yyyy');
  } catch {
    return value;
  }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || 'Not provided'}</p>
    </div>
  );
}

export function EmploymentTab({ employee, extendedProfile, managerName, showSensitiveSection }: EmploymentTabProps) {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Job Title" value={employee.job_title} />
          <Field label="Department" value={employee.department?.name || 'Unassigned'} />
          <Field label="Hire Date" value={formatDate(employee.hire_date)} />
          <Field label="Manager" value={managerName} />
          <Field label="Employment Type" value={extendedProfile?.employment_type?.replace(/_/g, ' ')} />
          <Field label="Work Location" value={extendedProfile?.work_location} />
          <Field label="Probation End Date" value={formatDate(extendedProfile?.probation_end_date)} />
          <Field label="Current Status" value={employee.status.replace(/_/g, ' ')} />
        </CardContent>
      </Card>

      {showSensitiveSection ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-muted-foreground" />
              Sensitive Employment Data
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of Birth" value={formatDate(extendedProfile?.date_of_birth)} />
            <Field label="National ID" value={extendedProfile?.national_id} />
            <Field label="Bank Name" value={extendedProfile?.bank_name} />
            <Field label="Bank Account" value={extendedProfile?.bank_account} />
            <Field label="Emergency Contact" value={extendedProfile?.emergency_contact_name} />
            <Field label="Emergency Phone" value={extendedProfile?.emergency_contact_phone} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
            <Shield className="mt-0.5 h-4 w-4 shrink-0" />
            Sensitive personal and financial sections are only visible to Admin, HR, and Director roles.
          </CardContent>
        </Card>
      )}

      <Card className="border-border/70 shadow-sm">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span>Hire date tracked in profile record</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Work location reflects extended employee profile</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-3 text-sm">
            <UserSquare2 className="h-4 w-4 text-muted-foreground" />
            <span>Manager assignments are shown contextually in the drawer</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-3 text-sm sm:col-span-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span>Financial identity fields remain read only in Phase 2A.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
