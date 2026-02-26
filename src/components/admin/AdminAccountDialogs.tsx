import { AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { AppRole, Department, EmployeeStatus, Profile } from '@/types/hrms';
import type { AdminEditProfileForm, AdminResetPasswordForm } from '@/components/admin/admin-form-types';

interface AdminAccountDialogsProps {
  selectedEmployee: Profile | null;
  departments?: Department[];
  isAdminLimitedProfileEditor: boolean;
  editProfileDialogOpen: boolean;
  onEditProfileDialogOpenChange: (open: boolean) => void;
  editForm: AdminEditProfileForm;
  onEditFormChange: (next: AdminEditProfileForm) => void;
  onSaveProfile: () => void;
  saveProfilePending: boolean;
  resetPasswordDialogOpen: boolean;
  onResetPasswordDialogOpenChange: (open: boolean) => void;
  resetPasswordForm: AdminResetPasswordForm;
  onResetPasswordFormChange: (next: AdminResetPasswordForm) => void;
  onResetUserPassword: () => void;
  resetPasswordPending: boolean;
  editRoleDialogOpen: boolean;
  onEditRoleDialogOpenChange: (open: boolean) => void;
  selectedRole: AppRole;
  onSelectedRoleChange: (role: AppRole) => void;
  onSaveRole: () => void;
  onDeleteRole: () => void;
  updateRolePending: boolean;
  deleteRolePending: boolean;
}

export function AdminAccountDialogs({
  selectedEmployee,
  departments,
  isAdminLimitedProfileEditor,
  editProfileDialogOpen,
  onEditProfileDialogOpenChange,
  editForm,
  onEditFormChange,
  onSaveProfile,
  saveProfilePending,
  resetPasswordDialogOpen,
  onResetPasswordDialogOpenChange,
  resetPasswordForm,
  onResetPasswordFormChange,
  onResetUserPassword,
  resetPasswordPending,
  editRoleDialogOpen,
  onEditRoleDialogOpenChange,
  selectedRole,
  onSelectedRoleChange,
  onSaveRole,
  onDeleteRole,
  updateRolePending,
  deleteRolePending,
}: AdminAccountDialogsProps) {
  return (
    <>
      <Dialog open={editProfileDialogOpen} onOpenChange={onEditProfileDialogOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isAdminLimitedProfileEditor ? 'Manage Account Access' : 'Edit Employee Profile'}</DialogTitle>
            <DialogDescription>
              {isAdminLimitedProfileEditor
                ? `Admin can update the username alias only for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}.`
                : `Update profile information for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isAdminLimitedProfileEditor ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="font-medium">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
                  {!isAdminLimitedProfileEditor && selectedEmployee?.employee_id ? (
                    <p className="mt-1 text-xs font-mono text-muted-foreground">{selectedEmployee.employee_id}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Admin access is limited to account-level username alias management. HR/Director manage employee profile details.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editForm.first_name}
                    onChange={(e) => onEditFormChange({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={editForm.last_name}
                    onChange={(e) => onEditFormChange({ ...editForm, last_name: e.target.value })}
                  />
                </div>
              </div>
            )}
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
            {!isAdminLimitedProfileEditor && (
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => onEditFormChange({ ...editForm, phone: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username Alias (Optional)</Label>
              <Input
                id="username"
                value={editForm.username}
                onChange={(e) => onEditFormChange({ ...editForm, username: e.target.value })}
                placeholder="e.g. john.doe"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <p className="text-xs text-muted-foreground">
                Employee ID is the recommended login handle. Username alias is optional and will be normalized to lowercase using letters, numbers, dot, underscore, or dash.
              </p>
            </div>
            {!isAdminLimitedProfileEditor && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={editForm.job_title}
                      onChange={(e) => onEditFormChange({ ...editForm, job_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee_id">Employee ID</Label>
                    <Input
                      id="employee_id"
                      value={editForm.employee_id}
                      onChange={(e) => onEditFormChange({ ...editForm, employee_id: e.target.value })}
                      placeholder="e.g. EMP-001"
                    />
                    <p className="text-xs text-muted-foreground">Recommended primary non-email login identifier.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={editForm.department_id}
                      onValueChange={(value) => onEditFormChange({ ...editForm, department_id: value })}
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
                      onValueChange={(value) => onEditFormChange({ ...editForm, status: value as EmployeeStatus })}
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
              </>
            )}
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditProfileDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={onSaveProfile} disabled={saveProfilePending}>
              {saveProfilePending
                ? 'Saving...'
                : isAdminLimitedProfileEditor
                  ? 'Save Username Alias'
                  : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resetPasswordDialogOpen} onOpenChange={onResetPasswordDialogOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reset User Password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {selectedEmployee?.first_name} {selectedEmployee?.last_name}. They will be signed out from existing sessions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="font-medium">
                {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </p>
              <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
              {!isAdminLimitedProfileEditor && selectedEmployee?.employee_id ? (
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {selectedEmployee.employee_id}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password-new">New Temporary Password</Label>
              <Input
                id="reset-password-new"
                type="password"
                value={resetPasswordForm.newPassword}
                onChange={(e) => onResetPasswordFormChange({ ...resetPasswordForm, newPassword: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">Confirm Password</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => onResetPasswordFormChange({ ...resetPasswordForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Username alias changes remain restricted to HR/Admin only and are enforced in the database.
            </p>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onResetPasswordDialogOpenChange(false)} disabled={resetPasswordPending}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={onResetUserPassword} disabled={resetPasswordPending || !selectedEmployee}>
              {resetPasswordPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editRoleDialogOpen} onOpenChange={onEditRoleDialogOpenChange}>
        <DialogContent className="max-w-lg sm:max-w-xl">
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
                  {selectedEmployee?.first_name?.[0]}{selectedEmployee?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{selectedEmployee?.first_name} {selectedEmployee?.last_name}</p>
                <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Role Assignment</Label>
              <Select value={selectedRole} onValueChange={(value) => onSelectedRoleChange(value as AppRole)}>
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
                      Director - Unrestricted business access & final leave approvals
                    </div>
                  </SelectItem>
                  <SelectItem value="hr">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      HR - Employee management, policies & leave monitoring (no leave approvals)
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      Admin - System supervision & role management (no approvals/payroll)
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
            <p className="text-xs text-muted-foreground">
              Removing a role assignment reverts the user to the default `employee` role.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditRoleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={onDeleteRole}
              disabled={deleteRolePending || !selectedEmployee}
            >
              {deleteRolePending ? 'Removing...' : 'Delete Role (Revert to Employee)'}
            </Button>
            <Button className="w-full sm:w-auto" onClick={onSaveRole} disabled={updateRolePending}>
              {updateRolePending ? 'Updating...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
