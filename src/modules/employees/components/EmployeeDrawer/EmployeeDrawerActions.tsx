import { Edit3, FileText, KeyRound, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import type { Department, Profile } from '@/types/hrms';

import type { EmployeeEditAccessMode, EmployeeRowActionPermissions } from '../../types';

interface EmployeeDrawerActionsProps {
  employee: Profile & { department: Department | null };
  permissions: EmployeeRowActionPermissions;
  onEditProfile: (employee: Profile & { department: Department | null }) => void;
  onResetPassword: (employee: Profile & { department: Department | null }) => void;
  onEditRole: (employee: Profile & { department: Department | null }) => void;
  onArchiveEmployee: (employee: Profile & { department: Department | null }) => void;
  onRestoreEmployee: (employee: Profile & { department: Department | null }) => void;
}

function getEditActionLabel(editAccessMode: EmployeeEditAccessMode) {
  switch (editAccessMode) {
    case 'manager_limited':
      return 'Update Contact';
    case 'alias_only':
      return 'Manage Account';
    case 'full':
      return 'Edit Employee';
    default:
      return 'View Only';
  }
}

function getEditActionHint(editAccessMode: EmployeeEditAccessMode) {
  switch (editAccessMode) {
    case 'manager_limited':
      return 'Managers can update phone and job title for direct reports only.';
    case 'alias_only':
      return 'This access mode is limited to username alias management.';
    case 'full':
      return 'Profile updates are handled directly in the employee workspace.';
    default:
      return 'No edit capability is available for this employee.';
  }
}

export function EmployeeDrawerActions({
  employee,
  permissions,
  onEditProfile,
  onResetPassword,
  onEditRole,
  onArchiveEmployee,
  onRestoreEmployee,
}: EmployeeDrawerActionsProps) {
  const editActionLabel = getEditActionLabel(permissions.editAccessMode);
  const editActionHint = getEditActionHint(permissions.editAccessMode);

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap gap-2">
        {permissions.editAccessMode !== 'none' ? (
          <Button size="sm" onClick={() => onEditProfile(employee)}>
            <Edit3 className="mr-2 h-4 w-4" />
            {editActionLabel}
          </Button>
        ) : null}

        {permissions.canResetPassword ? (
          <Button size="sm" variant="outline" onClick={() => onResetPassword(employee)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </Button>
        ) : null}

        {permissions.canManageRole ? (
          <Button size="sm" variant="outline" onClick={() => onEditRole(employee)}>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Manage Role
          </Button>
        ) : null}

        {permissions.canArchiveRestore ? (
          employee.status === 'terminated' ? (
            <Button size="sm" variant="outline" onClick={() => onRestoreEmployee(employee)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Employee
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => onArchiveEmployee(employee)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Archive Employee
            </Button>
          )
        ) : null}

        <Button size="sm" variant="ghost" asChild>
          <Link to={`/employees/${employee.id}`}>
            <FileText className="mr-2 h-4 w-4" />
            Open Full Profile
          </Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{editActionHint}</p>
    </div>
  );
}
