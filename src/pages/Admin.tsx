import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEmployees,
  useDepartments,
  useUpdateProfile,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useEmployees';
import { useUserRoles, useUpdateUserRole } from '@/hooks/useUserRoles';
import { useLeaveTypes, useUpdateLeaveType, useCreateLeaveType, useDeleteLeaveType } from '@/hooks/useLeaveTypes';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Briefcase, Calendar, AlertTriangle, FileText, Settings, Upload, Plus, Trash2, RotateCcw
} from 'lucide-react';
import { AppRole, Profile, EmployeeStatus, LeaveType } from '@/types/hrms';
import { Navigate } from 'react-router-dom';
import { BatchUpdateDialog } from '@/components/admin/BatchUpdateDialog';

export default function Admin() {
  const { role } = useAuth();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: userRoles, isLoading: rolesLoading } = useUserRoles();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();
  const updateProfile = useUpdateProfile();
  const updateUserRole = useUpdateUserRole();
  const updateLeaveType = useUpdateLeaveType();
  const createLeaveType = useCreateLeaveType();
  const deleteLeaveType = useDeleteLeaveType();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen] = useState(false);
  const [createLeaveTypeDialogOpen, setCreateLeaveTypeDialogOpen] = useState(false);
  const [deleteLeaveTypeDialogOpen, setDeleteLeaveTypeDialogOpen] = useState(false);
  const [editDepartmentDialogOpen, setEditDepartmentDialogOpen] = useState(false);
  const [deleteDepartmentDialogOpen, setDeleteDepartmentDialogOpen] = useState(false);
  const [batchUpdateDialogOpen, setBatchUpdateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('employee');
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<{ id: string; name: string; description: string | null } | null>(null);
  
  // Leave type edit form state
  const [leaveTypeForm, setLeaveTypeForm] = useState({
    name: '',
    description: '',
    days_allowed: 0,
    min_days: 0,
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
    employee_id: string;
    status: EmployeeStatus;
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department_id: '',
    employee_id: '',
    status: 'active',
  });
  
  // Create department state
  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
  });

  // Restrict access to admin/hr only
  if (role !== 'admin' && role !== 'hr') {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredEmployeesBySearch = employees?.filter((employee) => {
    const searchText = search.toLowerCase();
    return (
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchText) ||
      employee.email.toLowerCase().includes(searchText) ||
      employee.employee_id?.toLowerCase().includes(searchText)
    );
  });

  const filteredEmployees = filteredEmployeesBySearch?.filter((employee) => {
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || employee.department_id === departmentFilter;

    return matchesStatus && matchesDepartment;
  });

  const filteredDepartments = departments?.filter((department) => {
    const searchText = departmentSearch.toLowerCase();
    return (
      department.name.toLowerCase().includes(searchText) ||
      (department.description || '').toLowerCase().includes(searchText)
    );
  });

  const getUserRole = (userId: string): AppRole => {
    const userRole = userRoles?.find(ur => ur.user_id === userId);
    return userRole?.role || 'employee';
  };

  const roleColors: Record<AppRole, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    hr: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    director: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    general_manager: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
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
      department_id: employee.department_id || 'none',
      employee_id: employee.employee_id || '',
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
        department_id: editForm.department_id === 'none' ? null : editForm.department_id || null,
        employee_id: editForm.employee_id || null,
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

  const handleArchiveEmployee = async (employee: Profile) => {
    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'terminated' },
    });
  };

  const handleRestoreEmployee = async (employee: Profile) => {
    await updateProfile.mutateAsync({
      id: employee.id,
      updates: { status: 'active' },
    });
  };

  const handleEditDepartment = (department: { id: string; name: string; description: string | null }) => {
    setSelectedDepartment(department);
    setDepartmentForm({
      name: department.name,
      description: department.description || '',
    });
    setEditDepartmentDialogOpen(true);
  };

  const handleSaveDepartment = async () => {
    if (!selectedDepartment || !departmentForm.name.trim()) return;

    await updateDepartment.mutateAsync({
      id: selectedDepartment.id,
      updates: {
        name: departmentForm.name.trim(),
        description: departmentForm.description.trim() || null,
      },
    });
    setEditDepartmentDialogOpen(false);
    setSelectedDepartment(null);
  };

  const openDeleteDepartmentDialog = (department: { id: string; name: string; description: string | null }) => {
    setSelectedDepartment(department);
    setDeleteDepartmentDialogOpen(true);
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    await deleteDepartment.mutateAsync(selectedDepartment.id);
    setDeleteDepartmentDialogOpen(false);
    setSelectedDepartment(null);
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setLeaveTypeForm({
      name: leaveType.name,
      description: leaveType.description || '',
      days_allowed: leaveType.days_allowed,
      min_days: leaveType.min_days || 0,
      is_paid: leaveType.is_paid,
      requires_document: leaveType.requires_document || false,
    });
    setEditLeaveTypeDialogOpen(true);
  };

  const handleCreateLeaveType = () => {
    setLeaveTypeForm({
      name: '',
      description: '',
      days_allowed: 0,
      min_days: 0,
      is_paid: true,
      requires_document: false,
    });
    setCreateLeaveTypeDialogOpen(true);
  };

  const handleSaveNewLeaveType = async () => {
    await createLeaveType.mutateAsync({
      name: leaveTypeForm.name,
      description: leaveTypeForm.description || null,
      days_allowed: leaveTypeForm.days_allowed,
      min_days: leaveTypeForm.min_days,
      is_paid: leaveTypeForm.is_paid,
      requires_document: leaveTypeForm.requires_document,
    });
    setCreateLeaveTypeDialogOpen(false);
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

  const handleDeleteLeaveType = async () => {
    if (!selectedLeaveType) return;
    
    await deleteLeaveType.mutateAsync(selectedLeaveType.id);
    setDeleteLeaveTypeDialogOpen(false);
    setSelectedLeaveType(null);
  };

  const openDeleteLeaveTypeDialog = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setDeleteLeaveTypeDialogOpen(true);
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

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Management</CardTitle>
                  <CardDescription>View, filter, update, and archive employee profiles</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setBatchUpdateDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Batch Update
                  </Button>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as EmployeeStatus | 'all')}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments?.map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditProfile(employee)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {employee.status === 'terminated' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600 hover:text-emerald-700"
                                onClick={() => handleRestoreEmployee(employee)}
                                disabled={updateProfile.isPending}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleArchiveEmployee(employee)}
                                disabled={updateProfile.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredEmployees || filteredEmployees.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No employees match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    Department Management
                  </CardTitle>
                  <CardDescription>Create, update, and delete company departments</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search departments..."
                      className="pl-10"
                      value={departmentSearch}
                      onChange={(e) => setDepartmentSearch(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setCreateDeptDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Department
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments?.map((dept) => {
                    const employeeCount = employees?.filter(e => e.department_id === dept.id).length || 0;
                    return (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dept.description || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{employeeCount} employees</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDepartment(dept)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDepartmentDialog(dept)}
                              disabled={employeeCount > 0 || deleteDepartment.isPending}
                              title={employeeCount > 0 ? 'Remove or reassign employees before deleting this department.' : 'Delete department'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!departments || departments.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No departments yet. Create your first department.
                      </TableCell>
                    </TableRow>
                  )}
                  {departments && departments.length > 0 && filteredDepartments?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No departments match the current search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                    {filteredEmployeesBySearch?.map((employee) => {
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
                              {currentRole === 'director' && 'Director level leave approvals'}
                              {currentRole === 'general_manager' && 'GM level leave approvals, team oversight'}
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
                  <CardDescription>Configure leave types, advance notice, and document requirements</CardDescription>
                </div>
                <Button onClick={handleCreateLeaveType}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Leave Type
                </Button>
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
                      <TableHead>Advance Notice</TableHead>
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
                          <Badge variant="secondary">
                            {leaveType.min_days === 0 ? 'No notice' : `${leaveType.min_days ?? 0} day(s) notice`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveType.is_paid ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}>
                            {leaveType.is_paid ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={leaveType.requires_document ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}>
                            {leaveType.requires_document ? 'Required' : 'Optional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditLeaveType(leaveType)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteLeaveTypeDialog(leaveType)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!leaveTypes || leaveTypes.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No leave types configured. Add your first leave type.
                        </TableCell>
                      </TableRow>
                    )}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={editForm.employee_id}
                  onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })}
                  placeholder="e.g. EMP-001"
                />
              </div>
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
                    <SelectItem value="none">No Department</SelectItem>
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
                  <SelectItem value="general_manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      General Manager - GM level approvals
                    </div>
                  </SelectItem>
                  <SelectItem value="director">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      Director - Director level approvals
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
                <Label htmlFor="min_days">Advance Notice (Days)</Label>
                <Input
                  id="min_days"
                  type="number"
                  min={0}
                  value={leaveTypeForm.min_days}
                  onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, min_days: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Set to 0 for emergency leave (no advance notice required)</p>
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

      {/* Batch Update Dialog */}
      {/* Batch Update Dialog */}
      <BatchUpdateDialog
        open={batchUpdateDialogOpen}
        onOpenChange={setBatchUpdateDialogOpen}
        employees={employees}
        departments={departments}
      />

      {/* Create Department Dialog */}
      <Dialog open={createDeptDialogOpen} onOpenChange={setCreateDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Department</DialogTitle>
            <DialogDescription>
              Add a new department to the organization
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept_name">Department Name</Label>
              <Input
                id="dept_name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Engineering, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept_description">Description (Optional)</Label>
              <Input
                id="dept_description"
                value={newDeptDescription}
                onChange={(e) => setNewDeptDescription(e.target.value)}
                placeholder="Brief description of this department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDeptDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                createDepartment.mutate({ 
                  name: newDeptName, 
                  description: newDeptDescription 
                }, {
                  onSuccess: () => {
                    setCreateDeptDialogOpen(false);
                    setNewDeptName('');
                    setNewDeptDescription('');
                  }
                });
              }} 
              disabled={!newDeptName.trim() || createDepartment.isPending}
            >
              {createDepartment.isPending ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Department Dialog */}
      <Dialog open={editDepartmentDialogOpen} onOpenChange={setEditDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update settings for {selectedDepartment?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_dept_name">Department Name</Label>
              <Input
                id="edit_dept_name"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                placeholder="e.g. Engineering, Marketing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_dept_description">Description (Optional)</Label>
              <Input
                id="edit_dept_description"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                placeholder="Brief description of this department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDepartmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={!departmentForm.name.trim() || updateDepartment.isPending}
            >
              {updateDepartment.isPending ? 'Saving...' : 'Save Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Department Confirmation */}
      <AlertDialog open={deleteDepartmentDialogOpen} onOpenChange={setDeleteDepartmentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"? This action cannot be undone.
              Departments with assigned employees cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDepartment.isPending}
            >
              {deleteDepartment.isPending ? 'Deleting...' : 'Delete Department'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Leave Type Dialog */}
      <Dialog open={createLeaveTypeDialogOpen} onOpenChange={setCreateLeaveTypeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Leave Type</DialogTitle>
            <DialogDescription>
              Create a new leave type with its policy settings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_leave_name">Leave Type Name</Label>
              <Input
                id="new_leave_name"
                value={leaveTypeForm.name}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })}
                placeholder="e.g. Annual Leave, Sick Leave"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_leave_description">Description</Label>
              <Input
                id="new_leave_description"
                value={leaveTypeForm.description}
                onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })}
                placeholder="Brief description of this leave type"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_days_allowed">Days Allowed Per Year</Label>
                <Input
                  id="new_days_allowed"
                  type="number"
                  min={0}
                  value={leaveTypeForm.days_allowed}
                  onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, days_allowed: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_min_days">Advance Notice (Days)</Label>
                <Input
                  id="new_min_days"
                  type="number"
                  min={0}
                  value={leaveTypeForm.min_days}
                  onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, min_days: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Set to 0 for emergency leave (no advance notice required)</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="new_is_paid">Paid Leave</Label>
                <p className="text-sm text-muted-foreground">Employee receives salary during this leave</p>
              </div>
              <Switch
                id="new_is_paid"
                checked={leaveTypeForm.is_paid}
                onCheckedChange={(checked) => setLeaveTypeForm({ ...leaveTypeForm, is_paid: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="new_requires_document">Document Required</Label>
                <p className="text-sm text-muted-foreground">Require supporting documents (e.g., medical certificate)</p>
              </div>
              <Switch
                id="new_requires_document"
                checked={leaveTypeForm.requires_document}
                onCheckedChange={(checked) => setLeaveTypeForm({ ...leaveTypeForm, requires_document: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateLeaveTypeDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewLeaveType} 
              disabled={!leaveTypeForm.name.trim() || createLeaveType.isPending}
            >
              {createLeaveType.isPending ? 'Creating...' : 'Create Leave Type'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Leave Type Confirmation */}
      <AlertDialog open={deleteLeaveTypeDialogOpen} onOpenChange={setDeleteLeaveTypeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLeaveType?.name}"? This action cannot be undone.
              Existing leave requests using this type may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLeaveType}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLeaveType.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
