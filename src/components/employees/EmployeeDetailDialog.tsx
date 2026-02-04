import { Profile, Department, AppRole } from '@/types/hrms';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, Phone, Building, Briefcase, Calendar, 
  Hash, User, Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface EmployeeDetailDialogProps {
  employee: (Profile & { department: Department | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole?: AppRole;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-muted text-muted-foreground',
  on_leave: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  terminated: 'bg-red-500/20 text-red-600 border-red-500/30',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30',
  hr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  director: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  general_manager: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  employee: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function EmployeeDetailDialog({ 
  employee, 
  open, 
  onOpenChange,
  userRole = 'employee'
}: EmployeeDetailDialogProps) {
  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">
                {employee.first_name} {employee.last_name}
              </h3>
              <p className="text-muted-foreground">{employee.job_title || 'No job title'}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={statusColors[employee.status]}>
                  {employee.status}
                </Badge>
                <Badge className={roleColors[userRole]}>
                  {userRole}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.phone || 'Not provided'}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Work Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Work Information</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Employee ID</span>
                  <p className="text-sm font-mono">{employee.employee_id || 'Not assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Department</span>
                  <p className="text-sm">{employee.department?.name || 'Not assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Job Title</span>
                  <p className="text-sm">{employee.job_title || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
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
            </div>
          </div>

          <Separator />

          {/* System Information */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">System Information</h4>
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Account Created</span>
                  <p className="text-sm">
                    {format(new Date(employee.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">User ID</span>
                  <p className="text-sm font-mono text-xs truncate max-w-[300px]">{employee.id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}