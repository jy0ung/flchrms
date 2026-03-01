import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModalScaffold, ModalSection } from '@/components/system';
import { getRoleAuthorityTier } from '@/components/admin/admin-authority';
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
  currentAssignedRole: AppRole;
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
  currentAssignedRole,
  selectedRole,
  onSelectedRoleChange,
  onSaveRole,
  onDeleteRole,
  updateRolePending,
  deleteRolePending,
}: AdminAccountDialogsProps) {
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);

  useEffect(() => {
    if (!editRoleDialogOpen) {
      setConfirmRoleChange(false);
    }
  }, [editRoleDialogOpen]);

  const roleChangePreview = useMemo(() => {
    const previousTier = getRoleAuthorityTier(currentAssignedRole);
    const nextTier = getRoleAuthorityTier(selectedRole);
    return {
      hasRoleChange: selectedRole !== currentAssignedRole,
      previousTier,
      nextTier,
    };
  }, [currentAssignedRole, selectedRole]);

  return (
    <>
      <ModalScaffold
        open={editProfileDialogOpen}
        onOpenChange={onEditProfileDialogOpenChange}
        title={isAdminLimitedProfileEditor ? 'Manage Account Access' : 'Edit Employee Profile'}
        description={
          isAdminLimitedProfileEditor
            ? `Admin can update the username alias only for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}.`
            : `Update profile information for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`
        }
        maxWidth="2xl"
        body={(
          <div className="space-y-4">
          <ModalSection title={isAdminLimitedProfileEditor ? 'Account Access' : 'Profile Information'}>
          <div className="grid gap-4">
            {isAdminLimitedProfileEditor ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
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
          </ModalSection>
          </div>
        )}
        footer={(
          <>
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
          </>
        )}
      />

      <ModalScaffold
        open={resetPasswordDialogOpen}
        onOpenChange={onResetPasswordDialogOpenChange}
        title="Reset User Password"
        description={`Set a new temporary password for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}. They will be signed out from existing sessions.`}
        maxWidth="xl"
        body={(
          <ModalSection title="Password Reset">
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
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
          </ModalSection>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onResetPasswordDialogOpenChange(false)} disabled={resetPasswordPending}>
              Cancel
            </Button>
            <Button className="w-full sm:w-auto" onClick={onResetUserPassword} disabled={resetPasswordPending || !selectedEmployee}>
              {resetPasswordPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        )}
      />

      <ModalScaffold
        open={editRoleDialogOpen}
        onOpenChange={onEditRoleDialogOpenChange}
        title="Change User Role"
        description={`Update the system role for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}. This will affect their permissions immediately.`}
        maxWidth="2xl"
        contentClassName="sm:!left-auto sm:!right-0 sm:!top-0 sm:!h-screen sm:!max-h-screen sm:!w-[760px] sm:!max-w-[760px] sm:!translate-x-0 sm:!translate-y-0 sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l"
        body={(
          <div className="space-y-4">
            <ModalSection title="Selected User" tone="muted">
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
            </ModalSection>
            <ModalSection title="Role Assignment">
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
            </ModalSection>
            <ModalSection title="Change Preview" tone="muted">
              <div aria-live="polite" className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Role</p>
                    <p className="font-medium capitalize">{currentAssignedRole.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{roleChangePreview.previousTier.label}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposed Role</p>
                    <p className="font-medium capitalize">{selectedRole.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{roleChangePreview.nextTier.label}</p>
                  </div>
                </div>
                {!roleChangePreview.hasRoleChange ? (
                  <p className="text-xs text-muted-foreground">
                    No role change detected. Select a different role to proceed.
                  </p>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50/40 p-3">
                    <Checkbox
                      id="confirm-role-change"
                      checked={confirmRoleChange}
                      onCheckedChange={(checked) => setConfirmRoleChange(Boolean(checked))}
                    />
                    <Label htmlFor="confirm-role-change" className="text-sm font-normal leading-relaxed">
                      I confirm this role change is governance-impacting and takes effect immediately.
                    </Label>
                  </div>
                )}
              </div>
            </ModalSection>
            <ModalSection tone="warning" compact>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Role changes take effect immediately. The user may need to refresh their browser to see updated permissions.
              </p>
            </div>
            </ModalSection>
            <p className="text-xs text-muted-foreground">
              Removing a role assignment reverts the user to the default `employee` role.
            </p>
          </div>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditRoleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={onDeleteRole}
              disabled={deleteRolePending || !selectedEmployee || !confirmRoleChange}
            >
              {deleteRolePending ? 'Removing...' : 'Delete Role (Revert to Employee)'}
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onSaveRole}
              disabled={updateRolePending || !roleChangePreview.hasRoleChange || !confirmRoleChange}
            >
              {updateRolePending ? 'Publishing...' : 'Publish Role Change'}
            </Button>
          </>
        )}
      />
    </>
  );
}
