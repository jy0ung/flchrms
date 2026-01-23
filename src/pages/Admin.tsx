import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees, useDepartments, useUpdateProfile } from '@/hooks/useEmployees';
import { useUserRoles, useUpdateUserRole } from '@/hooks/useUserRoles';
import { useLeaveTypes, useUpdateLeaveType } from '@/hooks/useLeaveTypes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Shield, Users, Search, Edit, UserCog, Building, Mail, Phone,
  Briefcase, Calendar, AlertTriangle, FileText, Settings
} from 'lucide-react';
import { AppRole, Profile, EmployeeStatus, LeaveType } from '@/types/hrms';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { role } = useAuth();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();
  const updateProfile = useUpdateProfile();
  const updateUserRole = useUpdateUserRole();
  const updateLeaveType = useUpdateLeaveType();

  const [search, setSearch] = useState('');
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  
  // Leave type edit form state
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    description: '',
    days_allowed: 0,
    min_days: 1,
    is_paid: true,
    requires_document: false,
  });

  // Profile edit form state
  const [editForm, setEditForm] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    job_title: string;
    department_id: string;
    status: EmployeeStatus;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department_id: '',
    status: 'active',
  });

  // Restrict access to admin/hr only
  if (role !== 'admin' && role !== 'hr') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredEmployees = employees?.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(search.toLowerCase())
  );

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles?.find(ur => ur.user_id === userId);
    return userRole?.role || 'employee';
  };

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    hr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    manager: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    employee: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const handleEditProfile = (employee: Profile) => {
    setSelectedEmployee(employee);
    setEditForm({
      first_name: employee.first_name || '',
      last_name: employee.last_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      job_title: employee.job_title || '',
      department_id: employee.department_id || '',
      status: employee.status || 'active' as EmployeeStatus,
    });
    setEditProfileDialogOpen(true);
  };

  const handleEditRole = (employee: Profile) => {
    setSelectedEmployee(employee);
    setSelectedRole(getUserRole(employee.id));
    setEditRoleDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedEmployee) return;
    
    await updateProfile.mutateAsync({
      id: selectedEmployee.id,
      updates: {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
        job_title: editForm.job_title || null,
        department_id: editForm.department_id || null,
        status: editForm.status,
      },
    });
    setEditProfileDialogOpen(false);
  };

  const handleSaveRole = async () => {
    if (!selectedEmployee) return;
    
    await updateUserRole.mutateAsync({
      userId: selectedEmployee.id,
      newRole: selectedRole,
    });
    setEditRoleDialogOpen(false);
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setLeaveTypeForm({
      name: leaveType.name,
      description: leaveType.description || '',
      days_allowed: leaveType.days_allowed,
      min_days: leaveType.min_days || 1,
      is_paid: leaveType.is_paid,
      requires_document: leaveType.requires_document || false,
    });
    setEditLeaveTypeDialogOpen(true);
  };

  const handleSaveLeaveType = async () => {
    if (!selectedLeaveType) return;
    
    await updateLeaveType.mutateAsync({
      id: selectedLeaveType.id,
      updates: {
        name: leaveTypeForm.name,
        description: leaveTypeForm.description || null,
        days_allowed: leaveTypeForm.days_allowed,
        min_days: leaveTypeForm.min_days,
        is_paid: leaveTypeForm.is_paid,
        requires_document: leaveTypeForm.requires_document,
      },
    });
    setEditLeaveTypeDialogOpen(false);
  };

  const stats = {
    totalEmployees: employees?.length || 0,
    admins: userRoles?.filter(r => r.role === 'admin').length || 0,
    hrUsers: userRoles?.filter(r => r.role === 'hr').length || 0,
    managers: userRoles?.filter(r => r.role === 'manager').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent" />
            HR Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Manage employee profiles and system roles</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-stat">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold">{stats.totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-stat">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold">{stats.admins}</p>
              </div>
              <Shield className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-stat">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">HR Users</p>
                <p className="text-2xl font-bold">{stats.hrUsers}</p>
              </div>
              <UserCog className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-stat">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-2xl font-bold">{stats.managers}</p>
              </div>
              <Briefcase className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Employee Profiles
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

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Management</CardTitle>
                  <CardDescription>View and edit employee profiles</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees?.map((employee) => (
                      <TableRow key={employee.id}>
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
                        <TableCell className="font-mono text-sm">{employee.employee_id}</TableCell>
                        <TableCell>{employee.department?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={roleColors[getUserRole(employee.id)]}>
                            {getUserRole(employee.id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditProfile(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Role Management
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Admin Only
                    </Badge>
                  </CardTitle>
                  <CardDescription>Assign and modify user roles. Be careful - changes take effect immediately.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees?.map((employee) => {
                      const currentRole = getUserRole(employee.id);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {employee.first_name[0]}{employee.last_name[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                                <p className="text-sm text-muted-foreground">{employee.job_title || 'No title'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={roleColors[currentRole]}>
                              {currentRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {currentRole === 'admin' && 'Full system access, role management'}
                              {currentRole === 'hr' && 'Employee management, leave approval, announcements'}
                              {currentRole === 'manager' && 'Team oversight, leave approval, performance reviews'}
                              {currentRole === 'employee' && 'Self-service, own data access'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditRole(employee)}
                              disabled={role !== 'admin'}
                            >
                              <UserCog className="w-4 h-4 mr-2" />
                              Change Role
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Policies Tab */}
        <TabsContent value="leave-policies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Leave Policy Configuration
                  </CardTitle>
                  <CardDescription>Configure leave types, minimum days, and document requirements</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {leaveTypesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Days Allowed</TableHead>
                      <TableHead>Minimum Days</TableHead>
                      <TableHead>Paid Leave</TableHead>
                      <TableHead>Document Required</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes?.map((leaveType) => (
                      <TableRow key={leaveType.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{leaveType.name}</p>
                            {leaveType.description && (
                              <p className="text-sm text-muted-foreground">{leaveType.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{leaveType.days_allowed} days/year</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{leaveType.min_days || 1} day(s) min</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveType.is_paid ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                            {leaveType.is_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveType.requires_document ? 'bg-orange-500/20 text-orange-600' : 'bg-muted text-muted-foreground'}>
                            {leaveType.requires_document ? 'Required' : 'Optional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditLeaveType(leaveType)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Policy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
            <DialogDescription>
              Update profile information for {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed from here</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={editForm.job_title}
                onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={editForm.department_id}
                  onValueChange={(value) => setEditForm({ ...editForm, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Department</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm({ ...editForm, status: value as EmployeeStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the system role for {selectedEmployee?.first_name} {selectedEmployee?.last_name}.
              This will affect their permissions immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {selectedEmployee?.first_name[0]}{selectedEmployee?.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select New Role</Label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                      Employee - Basic self-service access
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      Manager - Team oversight & approvals
                    </div>
                  </SelectItem>
                  <SelectItem value="hr">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      HR - Employee management & policies
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      Admin - Full system access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Role changes take effect immediately. The user may need to refresh their browser to see updated permissions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={updateUserRole.isPending}>
              {updateUserRole.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Leave Type Policy Dialog */}
      <Dialog open={editLeaveTypeDialogOpen} onOpenChange={setEditLeaveTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Leave Policy</DialogTitle>
            <DialogDescription>
              Configure policy settings for {selectedLeaveType?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="leave_name">Leave Type Name</Label>
              <Input
                id="leave_name"
                value={leaveTypeForm.name}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave_description">Description</Label>
              <Input
                id="leave_description"
                value={leaveTypeForm.description}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })}
                placeholder="Brief description of this leave type"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="days_allowed">Days Allowed Per Year</Label>
                <Input
                  id="days_allowed"
                  type="number"
                  min={0}
                  value={leaveTypeForm.days_allowed}
                  onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, days_allowed: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_days">Minimum Days Required</Label>
                <Input
                  id="min_days"
                  type="number"
                  min={1}
                  value={leaveTypeForm.min_days}
                  onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, min_days: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">E.g., Annual Leave must be at least 7 days</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="is_paid">Paid Leave</Label>
                <p className="text-sm text-muted-foreground">Employee receives salary during this leave</p>
              </div>
              <Switch
                id="is_paid"
                checked={leaveTypeForm.is_paid}
                onCheckedChange={(checked) => setLeaveTypeForm({ ...leaveTypeForm, is_paid: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="requires_document">Document Required</Label>
                <p className="text-sm text-muted-foreground">Require supporting documents (e.g., medical certificate)</p>
              </div>
              <Switch
                id="requires_document"
                checked={leaveTypeForm.requires_document}
                onCheckedChange={(checked) => setLeaveTypeForm({ ...leaveTypeForm, requires_document: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLeaveTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLeaveType} disabled={updateLeaveType.isPending}>
              {updateLeaveType.isPending ? 'Saving...' : 'Save Policy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}