import { useEmployees } from '@/hooks/useEmployees';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Users, Search, Mail, Building, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { Profile, Department, AppRole } from '@/types/hrms';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';

export default function Employees() {
  const { data: employees, isLoading } = useEmployees();
  const { data: userRoles } = useUserRoles();
  const [search, setSearch] = useState('');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<(Profile & { department: Department | null }) | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const filteredEmployees = employees?.filter(emp => 
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles?.find(ur => ur.user_id === userId);
    return userRole?.role || 'employee';
  };

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

  const handleEmployeeClick = (employee: Profile & { department: Department | null }) => {
    setSelectedEmployee(employee);
    setDetailDialogOpen(true);
  };

  const LoadingGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="card-stat">
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const LoadingListSkeleton = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            Employee Directory
          </h1>
          <p className="text-muted-foreground mt-1">{employees?.length || 0} employees</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search employees..." 
            className="pl-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ToggleGroup 
          type="single" 
          value={viewType} 
          onValueChange={(value) => value && setViewType(value as 'grid' | 'list')}
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGrid className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isLoading ? (
        viewType === 'grid' ? <LoadingGridSkeleton /> : <LoadingListSkeleton />
      ) : viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees?.map((employee) => (
            <Card 
              key={employee.id} 
              className="card-stat hover:border-accent/50 cursor-pointer transition-all"
              onClick={() => handleEmployeeClick(employee)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <Badge className={statusColors[employee.status]}>{employee.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{employee.job_title || 'No title'}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {employee.email}
                      </p>
                      {employee.department && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Building className="w-3 h-3" /> {employee.department.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees?.map((employee) => (
                  <TableRow 
                    key={employee.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEmployeeClick(employee)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {employee.first_name[0]}{employee.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                          <p className="text-sm text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.department?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[getUserRole(employee.id)]}>
                        {getUserRole(employee.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[employee.status]}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <EmployeeDetailDialog
        employee={selectedEmployee}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        userRole={selectedEmployee ? getUserRole(selectedEmployee.id) : 'employee'}
      />
    </div>
  );
}
