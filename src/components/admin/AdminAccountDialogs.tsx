import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { getRoleAuthorityTier } from '@/components/admin/admin-authority';
import type {
  AdminEditProfileForm,
  AdminResetPasswordForm,
} from '@/components/admin/admin-form-types';
import { ModalScaffold, ModalSection } from '@/components/system';
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
import type { EmployeeEditAccessMode } from '@/modules/employees/types';
import type { AppRole, Department, EmployeeStatus, Profile } from '@/types/hrms';

interface AdminAccountDialogsProps {
  selectedEmployee: Profile | null;
  departments?: Department[];
  employees?: (Profile & { department: Department | null })[];
  isAdminLimitedProfileEditor: boolean;
  editAccessMode?: EmployeeEditAccessMode;
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
  onSaveRole: (reason: string) => void;
  onDeleteRole: (reason: string) => void;
  updateRolePending: boolean;
  deleteRolePending: boolean;
}

const minimumGovernanceReasonLength = 5;

function ReadonlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || ''} disabled className="bg-muted" />
    </div>
  );
}

function getEditDialogCopy(
  editAccessMode: EmployeeEditAccessMode,
  selectedEmployee: Profile | null,
) {
  const fullName = `${selectedEmployee?.first_name ?? ''} ${selectedEmployee?.last_name ?? ''}`.trim();

  if (editAccessMode === 'alias_only') {
    return {
      title: 'Manage Account Access',
      description: `Admin can update the username alias only for ${fullName}.`,
      sectionTitle: 'Account Access',
      submitLabel: 'Save Username Alias',
    };
  }

  if (editAccessMode === 'manager_limited') {
    return {
      title: 'Update Employee Contact',
      description: `Managers can update phone and job title for ${fullName}. Other fields remain read only.`,
      sectionTitle: 'Limited Edit Access',
      submitLabel: 'Save Contact Changes',
    };
  }

  if (editAccessMode === 'none') {
    return {
      title: 'Employee Profile',
      description: `${fullName} is view only in this workspace.`,
      sectionTitle: 'Profile Information',
      submitLabel: 'Save Changes',
    };
  }

  return {
    title: 'Edit Employee Profile',
    description: `Update profile information for ${fullName}`,
    sectionTitle: 'Profile Information',
    submitLabel: 'Save Changes',
  };
}

export function AdminAccountDialogs({
  selectedEmployee,
  departments,
  employees,
  isAdminLimitedProfileEditor,
  editAccessMode,
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
  const [roleChangeReason, setRoleChangeReason] = useState('');

  useEffect(() => {
    if (!editRoleDialogOpen) {
      setConfirmRoleChange(false);
      setRoleChangeReason('');
    }
  }, [editRoleDialogOpen]);

  const effectiveEditAccessMode = editAccessMode ?? (isAdminLimitedProfileEditor ? 'alias_only' : 'full');
  const isAliasOnly = effectiveEditAccessMode === 'alias_only';
  const isManagerLimited = effectiveEditAccessMode === 'manager_limited';
  const isFullEdit = effectiveEditAccessMode === 'full';
  const canSubmitProfile = effectiveEditAccessMode !== 'none';
  const editDialogCopy = getEditDialogCopy(effectiveEditAccessMode, selectedEmployee);

  const roleChangePreview = useMemo(() => {
    const previousTier = getRoleAuthorityTier(currentAssignedRole);
    const nextTier = getRoleAuthorityTier(selectedRole);
    return {
      hasRoleChange: selectedRole !== currentAssignedRole,
      previousTier,
      nextTier,
    };
  }, [currentAssignedRole, selectedRole]);
  const hasValidRoleReason = roleChangeReason.trim().length >= minimumGovernanceReasonLength;

  return (
    <>
      <ModalScaffold
        open={editProfileDialogOpen}
        onOpenChange={onEditProfileDialogOpenChange}
        title={editDialogCopy.title}
        description={editDialogCopy.description}
        maxWidth="2xl"
        body={
          <div className="space-y-4">
            <ModalSection title={editDialogCopy.sectionTitle}>
              <div className="grid gap-4">
                {(isAliasOnly || isManagerLimited) ? (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="font-medium">
                      {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
                    {selectedEmployee?.employee_id ? (
                      <p className="mt-1 text-xs font-mono text-muted-foreground">{selectedEmployee.employee_id}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {isAliasOnly
                        ? 'This mode is limited to username alias management.'
                        : 'This mode is limited to phone and job title updates for direct reports.'}
                    </p>
                  </div>
                ) : null}

                {isFullEdit ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={editForm.first_name}
                        onChange={(event) => onEditFormChange({ ...editForm, first_name: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={editForm.last_name}
                        onChange={(event) => onEditFormChange({ ...editForm, last_name: event.target.value })}
                      />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={editForm.email} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed from here.</p>
                </div>

                {isManagerLimited || isFullEdit ? (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(event) => onEditFormChange({ ...editForm, phone: event.target.value })}
                    />
                  </div>
                ) : null}

                {(isAliasOnly || isFullEdit) ? (
                  <div className="space-y-2">
                    <Label htmlFor="username">Username Alias (Optional)</Label>
                    <Input
                      id="username"
                      value={editForm.username}
                      onChange={(event) => onEditFormChange({ ...editForm, username: event.target.value })}
                      placeholder="e.g. john.doe"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      Employee ID is the recommended login handle. Username alias is optional and will be normalized to lowercase using letters, numbers, dot, underscore, or dash.
                    </p>
                  </div>
                ) : null}

                {isManagerLimited ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="job_title">Job Title</Label>
                      <Input
                        id="job_title"
                        value={editForm.job_title}
                        onChange={(event) => onEditFormChange({ ...editForm, job_title: event.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadonlyField label="Username Alias" value={editForm.username ? `@${editForm.username}` : 'Not set'} />
                      <ReadonlyField label="Employee ID" value={editForm.employee_id || 'Not assigned'} />
                      <ReadonlyField
                        label="Department"
                        value={departments?.find((department) => department.id === editForm.department_id)?.name || 'No Department'}
                      />
                      <ReadonlyField label="Status" value={editForm.status.replace(/_/g, ' ')} />
                      <ReadonlyField label="Hire Date" value={editForm.hire_date || 'Not set'} />
                      <ReadonlyField
                        label="Manager"
                        value={employees?.find((employee) => employee.id === editForm.manager_id)?.first_name
                          ? `${employees?.find((employee) => employee.id === editForm.manager_id)?.first_name} ${employees?.find((employee) => employee.id === editForm.manager_id)?.last_name}`
                          : 'No manager assigned'}
                      />
                    </div>
                  </>
                ) : null}

                {isFullEdit ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="job_title">Job Title</Label>
                        <Input
                          id="job_title"
                          value={editForm.job_title}
                          onChange={(event) => onEditFormChange({ ...editForm, job_title: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="employee_id">Employee ID</Label>
                        <Input
                          id="employee_id"
                          value={editForm.employee_id}
                          onChange={(event) => onEditFormChange({ ...editForm, employee_id: event.target.value })}
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
                            {departments?.map((department) => (
                              <SelectItem key={department.id} value={department.id}>
                                {department.name}
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
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="hire_date">Hire Date</Label>
                        <Input
                          id="hire_date"
                          type="date"
                          value={editForm.hire_date}
                          onChange={(event) => onEditFormChange({ ...editForm, hire_date: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="manager">Manager</Label>
                        <Select
                          value={editForm.manager_id}
                          onValueChange={(value) => onEditFormChange({ ...editForm, manager_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Manager</SelectItem>
                            {employees
                              ?.filter((employee) => employee.id !== selectedEmployee?.id)
                              .map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.first_name} {employee.last_name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </ModalSection>
          </div>
        }
        footer={
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditProfileDialogOpenChange(false)}>
              Cancel
            </Button>
            {canSubmitProfile ? (
              <Button className="w-full sm:w-auto" onClick={onSaveProfile} disabled={saveProfilePending}>
                {saveProfilePending ? 'Saving...' : editDialogCopy.submitLabel}
              </Button>
            ) : null}
          </>
        }
      />

      <ModalScaffold
        open={resetPasswordDialogOpen}
        onOpenChange={onResetPasswordDialogOpenChange}
        title="Reset User Password"
        description={`Set a new temporary password for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}. They will be signed out from existing sessions.`}
        maxWidth="xl"
        body={
          <ModalSection title="Password Reset">
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="font-medium">
                  {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
                {!isAliasOnly && selectedEmployee?.employee_id ? (
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedEmployee.employee_id}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-password-new">New Temporary Password</Label>
                <Input
                  id="reset-password-new"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(event) => onResetPasswordFormChange({ ...resetPasswordForm, newPassword: event.target.value })}
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
                  onChange={(event) => onResetPasswordFormChange({ ...resetPasswordForm, confirmPassword: event.target.value })}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Password resets remain restricted to the roles allowed by the employee module capability gateway.
              </p>
            </div>
          </ModalSection>
        }
        footer={
          <>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => onResetPasswordDialogOpenChange(false)}
              disabled={resetPasswordPending}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onResetUserPassword}
              disabled={resetPasswordPending || !selectedEmployee}
            >
              {resetPasswordPending ? 'Resetting...' : 'Reset Password'}
            </Button>
          </>
        }
      />

      <ModalScaffold
        open={editRoleDialogOpen}
        onOpenChange={onEditRoleDialogOpenChange}
        title="Change User Role"
        description={`Update the system role for ${selectedEmployee?.first_name} ${selectedEmployee?.last_name}. This will affect their permissions immediately.`}
        maxWidth="2xl"
        contentClassName="sm:!left-auto sm:!right-0 sm:!top-0 sm:!h-screen sm:!max-h-screen sm:!w-[760px] sm:!max-w-[760px] sm:!translate-x-0 sm:!translate-y-0 sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l"
        body={
          <div className="space-y-4">
            <ModalSection title="Selected User" tone="muted">
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedEmployee?.first_name?.[0]}
                    {selectedEmployee?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                  </p>
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
                    <SelectItem value="employee">Employee - Basic self-service access</SelectItem>
                    <SelectItem value="manager">Manager - Team oversight and approvals</SelectItem>
                    <SelectItem value="general_manager">General Manager - GM level approvals</SelectItem>
                    <SelectItem value="director">Director - Unrestricted business access and final leave approvals</SelectItem>
                    <SelectItem value="hr">HR - Employee management, policies, and leave monitoring</SelectItem>
                    <SelectItem value="admin">Admin - System supervision and role management</SelectItem>
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

            <ModalSection
              title="Governance Reason"
              description="Required for the audit trail before publishing or removing a role assignment."
            >
              <div className="space-y-2">
                <Label htmlFor="role-change-reason">Reason</Label>
                <Input
                  id="role-change-reason"
                  value={roleChangeReason}
                  onChange={(event) => setRoleChangeReason(event.target.value)}
                  placeholder="Explain why this role change is needed..."
                />
                <p className="text-xs text-muted-foreground">
                  Minimum {minimumGovernanceReasonLength} characters. This reason is captured in the governance audit trail.
                </p>
              </div>
            </ModalSection>

            <ModalSection tone="warning" compact>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="flex items-start gap-2 text-sm text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Role changes take effect immediately. The user may need to refresh their browser to see updated permissions.
                </p>
              </div>
            </ModalSection>

            <p className="text-xs text-muted-foreground">
              Removing a role assignment reverts the user to the default `employee` role.
            </p>
          </div>
        }
        footer={
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditRoleDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => onDeleteRole(roleChangeReason.trim())}
              disabled={deleteRolePending || !selectedEmployee || !confirmRoleChange || !hasValidRoleReason}
            >
              {deleteRolePending ? 'Removing...' : 'Delete Role (Revert to Employee)'}
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={() => onSaveRole(roleChangeReason.trim())}
              disabled={updateRolePending || !roleChangePreview.hasRoleChange || !confirmRoleChange || !hasValidRoleReason}
            >
              {updateRolePending ? 'Publishing...' : 'Publish Role Change'}
            </Button>
          </>
        }
      />
    </>
  );
}
