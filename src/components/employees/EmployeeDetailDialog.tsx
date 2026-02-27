import { Profile, Department, AppRole } from '@/types/hrms';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, Phone, Building, Briefcase, Calendar, 
  Hash, User, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import {
  canViewSensitiveEmployeeContact,
  canViewSensitiveEmployeeIdentifiers,
} from '@/lib/permissions';
import { ModalScaffold, ModalSection, StatusBadge } from '@/components/system';

interface EmployeeDetailDialogProps {
  employee: (Profile & { department: Department | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: AppRole;
  viewerRole?: AppRole | null;
}

const roleColors: Record<AppRole, string> = {
  admin: 'bg-rose-50 text-rose-800 border-rose-200',
  hr: 'bg-violet-50 text-violet-800 border-violet-200',
  director: 'bg-amber-50 text-amber-800 border-amber-200',
  general_manager: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  manager: 'bg-blue-50 text-blue-800 border-blue-200',
  employee: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function EmployeeDetailDialog({ 
  employee, 
  open, 
  onOpenChange,
  userRole = 'employee',
  viewerRole = 'employee',
}: EmployeeDetailDialogProps) {
  if (!employee) return null;

  const showSensitiveIdentifiers = canViewSensitiveEmployeeIdentifiers(viewerRole);
  const showSensitiveContact = canViewSensitiveEmployeeContact(viewerRole);
  const roleLabel = userRole.replace(/_/g, ' ');
  const statusLabel = employee.status.replace(/_/g, ' ');
  const employeeName = `${employee.first_name} ${employee.last_name}`;
  const dialogDescription = `View detailed information about ${employeeName}`;

  return (
    <ModalScaffold
      open={open}
      onOpenChange={onOpenChange}
      title="Employee Details"
      description={dialogDescription}
      maxWidth="3xl"
      statusBadge={<StatusBadge status={employee.status} labelOverride={statusLabel} />}
      headerMeta={(
        <Badge className={roleColors[userRole]}>
          {roleLabel}
        </Badge>
      )}
      bodyClassName="max-h-[78vh] overflow-y-auto pr-1"
      body={(
        <div className="flex flex-col gap-6 md:flex-row">
          <ModalSection title="Profile" className="md:w-1/3">
            <div className="flex flex-col items-center text-center rounded-xl border border-border/60 bg-muted/20 py-4">
              <Avatar className="mb-4 h-20 w-20">
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {employee.first_name[0]}{employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold">{employeeName}</h3>
              <p className="mb-3 text-sm text-muted-foreground">{employee.job_title || 'No job title'}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <StatusBadge status={employee.status} labelOverride={statusLabel} />
                <Badge className={roleColors[userRole]}>{roleLabel}</Badge>
              </div>

              <div className="mt-4 w-full space-y-2 border-t border-border px-4 pt-4">
                <a
                  href={`mailto:${employee.email}`}
                  className="flex items-center justify-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:text-primary"
                >
                  <Mail className="h-4 w-4" />
                  <span className="max-w-[150px] truncate">{employee.email}</span>
                </a>
                {showSensitiveContact && employee.phone && (
                  <a
                    href={`tel:${employee.phone}`}
                    className="flex items-center justify-center gap-2 rounded-full border border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:text-primary"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{employee.phone}</span>
                  </a>
                )}
              </div>
            </div>
          </ModalSection>

          <ModalSection title="Details" className="flex-1 md:border-l md:border-border md:pl-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Employee ID</span>
                  <p className="text-sm font-mono">
                    {showSensitiveIdentifiers ? (employee.employee_id || 'Not assigned') : 'Restricted'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Department</span>
                  <p className="text-sm">{employee.department?.name || 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Job Title</span>
                  <p className="text-sm">{employee.job_title || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Hire Date</span>
                  <p className="text-sm">
                    {employee.hire_date 
                      ? format(new Date(employee.hire_date), 'MMMM d, yyyy')
                      : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Account Created</span>
                  <p className="text-sm">
                    {format(new Date(employee.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl border border-border/60 bg-muted/30">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">User ID</span>
                  <p className="text-xs font-mono truncate max-w-[150px]" title={showSensitiveIdentifiers ? employee.id : 'Restricted'}>
                    {showSensitiveIdentifiers ? employee.id : 'Restricted'}
                  </p>
                </div>
              </div>
            </div>
          </ModalSection>
        </div>
      )}
      showCloseButton
    />
  );
}
