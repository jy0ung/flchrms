import { Profile, Department, AppRole } from '@/types/hrms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Employee Details</DialogTitle>
          <DialogDescription className="sr-only">
            View detailed information about {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left Column - Profile Header */}
          <div className="flex flex-col items-center text-center md:w-1/3 py-4">
            <Avatar className="w-20 h-20 mb-4">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">{employee.job_title || 'No job title'}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge className={statusColors[employee.status]}>
                {employee.status}
              </Badge>
              <Badge className={roleColors[userRole]}>
                {userRole.replace('_', ' ')}
              </Badge>
            </div>
            
            {/* Contact Quick Actions */}
            <div className="mt-4 pt-4 border-t border-border w-full space-y-2">
              <a 
                href={`mailto:${employee.email}`} 
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="truncate max-w-[150px]">{employee.email}</span>
              </a>
              {employee.phone && (
                <a 
                  href={`tel:${employee.phone}`}
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Details Grid */}
          <div className="flex-1 md:border-l md:border-border md:pl-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Employee ID */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Employee ID</span>
                  <p className="text-sm font-mono">{employee.employee_id || 'Not assigned'}</p>
                </div>
              </div>
              
              {/* Department */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Building className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Department</span>
                  <p className="text-sm">{employee.department?.name || 'Not assigned'}</p>
                </div>
              </div>
              
              {/* Job Title */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Job Title</span>
                  <p className="text-sm">{employee.job_title || 'Not specified'}</p>
                </div>
              </div>
              
              {/* Hire Date */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
              
              {/* Account Created */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">Account Created</span>
                  <p className="text-sm">
                    {format(new Date(employee.created_at), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              
              {/* User ID */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <span className="text-xs text-muted-foreground">User ID</span>
                  <p className="text-xs font-mono truncate max-w-[150px]" title={employee.id}>
                    {employee.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}