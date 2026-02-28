import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ModalScaffold, ModalSection } from '@/components/system';
import type { LeaveType } from '@/types/hrms';
import type { AdminLeaveTypeForm } from '@/components/admin/admin-form-types';

interface AdminLeaveTypeDialogsProps {
  editLeaveTypeDialogOpen: boolean;
  onEditLeaveTypeDialogOpenChange: (open: boolean) => void;
  createLeaveTypeDialogOpen: boolean;
  onCreateLeaveTypeDialogOpenChange: (open: boolean) => void;
  deleteLeaveTypeDialogOpen: boolean;
  onDeleteLeaveTypeDialogOpenChange: (open: boolean) => void;
  selectedLeaveType: LeaveType | null;
  leaveTypeForm: AdminLeaveTypeForm;
  onLeaveTypeFormChange: (next: AdminLeaveTypeForm) => void;
  onSaveLeaveType: () => void;
  onSaveNewLeaveType: () => void;
  onDeleteLeaveType: () => void;
  updateLeaveTypePending: boolean;
  createLeaveTypePending: boolean;
  deleteLeaveTypePending: boolean;
}

function LeaveTypeFormFields({
  prefix,
  leaveTypeForm,
  onLeaveTypeFormChange,
}: {
  prefix: string;
  leaveTypeForm: AdminLeaveTypeForm;
  onLeaveTypeFormChange: (next: AdminLeaveTypeForm) => void;
}) {
  return (
      <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_leave_name`}>Leave Type Name</Label>
        <Input
          id={`${prefix}_leave_name`}
          value={leaveTypeForm.name}
          onChange={(e) => onLeaveTypeFormChange({ ...leaveTypeForm, name: e.target.value })}
          placeholder="e.g. Annual Leave, Sick Leave"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}_leave_description`}>Description</Label>
        <Input
          id={`${prefix}_leave_description`}
          value={leaveTypeForm.description}
          onChange={(e) => onLeaveTypeFormChange({ ...leaveTypeForm, description: e.target.value })}
          placeholder="Brief description of this leave type"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_days_allowed`}>Days Allowed Per Year</Label>
          <Input
            id={`${prefix}_days_allowed`}
            type="number"
            min={0}
            value={leaveTypeForm.days_allowed}
            onChange={(e) => onLeaveTypeFormChange({ ...leaveTypeForm, days_allowed: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${prefix}_min_days`}>Advance Notice (Days)</Label>
          <Input
            id={`${prefix}_min_days`}
            type="number"
            min={0}
            value={leaveTypeForm.min_days}
            onChange={(e) => onLeaveTypeFormChange({ ...leaveTypeForm, min_days: parseInt(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">
            Set to 0 for emergency leave (no advance notice required)
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
        <div>
          <Label htmlFor={`${prefix}_is_paid`}>Paid Leave</Label>
          <p className="text-sm text-muted-foreground">Employee receives salary during this leave</p>
        </div>
        <Switch
          id={`${prefix}_is_paid`}
          checked={leaveTypeForm.is_paid}
          onCheckedChange={(checked) => onLeaveTypeFormChange({ ...leaveTypeForm, is_paid: checked })}
        />
      </div>
      <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
        <div>
          <Label htmlFor={`${prefix}_requires_document`}>Document Required</Label>
          <p className="text-sm text-muted-foreground">
            Require supporting documents (e.g., medical certificate)
          </p>
        </div>
        <Switch
          id={`${prefix}_requires_document`}
          checked={leaveTypeForm.requires_document}
          onCheckedChange={(checked) =>
            onLeaveTypeFormChange({ ...leaveTypeForm, requires_document: checked })
          }
        />
      </div>
    </div>
  );
}

export function AdminLeaveTypeDialogs({
  editLeaveTypeDialogOpen,
  onEditLeaveTypeDialogOpenChange,
  createLeaveTypeDialogOpen,
  onCreateLeaveTypeDialogOpenChange,
  deleteLeaveTypeDialogOpen,
  onDeleteLeaveTypeDialogOpenChange,
  selectedLeaveType,
  leaveTypeForm,
  onLeaveTypeFormChange,
  onSaveLeaveType,
  onSaveNewLeaveType,
  onDeleteLeaveType,
  updateLeaveTypePending,
  createLeaveTypePending,
  deleteLeaveTypePending,
}: AdminLeaveTypeDialogsProps) {
  const [confirmPublishEdit, setConfirmPublishEdit] = useState(false);
  const [confirmPublishCreate, setConfirmPublishCreate] = useState(false);

  useEffect(() => {
    if (!editLeaveTypeDialogOpen) setConfirmPublishEdit(false);
  }, [editLeaveTypeDialogOpen]);

  useEffect(() => {
    if (!createLeaveTypeDialogOpen) setConfirmPublishCreate(false);
  }, [createLeaveTypeDialogOpen]);

  return (
    <>
      <ModalScaffold
        open={editLeaveTypeDialogOpen}
        onOpenChange={onEditLeaveTypeDialogOpenChange}
        title="Edit Leave Policy"
        description={`Configure policy settings for ${selectedLeaveType?.name ?? 'leave type'}`}
        maxWidth="xl"
        body={(
          <div className="space-y-4">
            <ModalSection title="Policy Settings">
              <LeaveTypeFormFields
                prefix="edit"
                leaveTypeForm={leaveTypeForm}
                onLeaveTypeFormChange={onLeaveTypeFormChange}
              />
            </ModalSection>
            <ModalSection title="Publishing State" tone="warning" compact>
              <div className="space-y-3 rounded-lg border border-amber-300/40 bg-amber-50/40 p-3">
                <p className="text-sm text-amber-900">
                  This policy is published immediately after saving and affects future leave requests.
                </p>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm-policy-publish-edit"
                    checked={confirmPublishEdit}
                    onCheckedChange={(checked) => setConfirmPublishEdit(Boolean(checked))}
                  />
                  <Label htmlFor="confirm-policy-publish-edit" className="text-sm font-normal leading-relaxed">
                    I confirm this policy update is ready to publish.
                  </Label>
                </div>
              </div>
            </ModalSection>
          </div>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onEditLeaveTypeDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onSaveLeaveType}
              disabled={updateLeaveTypePending || !confirmPublishEdit}
            >
              {updateLeaveTypePending ? 'Publishing...' : 'Publish Policy'}
            </Button>
          </>
        )}
      />

      <ModalScaffold
        open={createLeaveTypeDialogOpen}
        onOpenChange={onCreateLeaveTypeDialogOpenChange}
        title="Add New Leave Type"
        description="Create a new leave type with its policy settings"
        maxWidth="xl"
        body={(
          <div className="space-y-4">
            <ModalSection title="Policy Settings">
              <LeaveTypeFormFields
                prefix="new"
                leaveTypeForm={leaveTypeForm}
                onLeaveTypeFormChange={onLeaveTypeFormChange}
              />
            </ModalSection>
            <ModalSection title="Publishing State" tone="warning" compact>
              <div className="space-y-3 rounded-lg border border-amber-300/40 bg-amber-50/40 p-3">
                <p className="text-sm text-amber-900">
                  New leave policies are published immediately once created.
                </p>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirm-policy-publish-create"
                    checked={confirmPublishCreate}
                    onCheckedChange={(checked) => setConfirmPublishCreate(Boolean(checked))}
                  />
                  <Label htmlFor="confirm-policy-publish-create" className="text-sm font-normal leading-relaxed">
                    I confirm this new policy is ready to publish.
                  </Label>
                </div>
              </div>
            </ModalSection>
          </div>
        )}
        footer={(
          <>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => onCreateLeaveTypeDialogOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto"
              onClick={onSaveNewLeaveType}
              disabled={!leaveTypeForm.name.trim() || createLeaveTypePending || !confirmPublishCreate}
            >
              {createLeaveTypePending ? 'Publishing...' : 'Publish Leave Type'}
            </Button>
          </>
        )}
      />

      <AlertDialog open={deleteLeaveTypeDialogOpen} onOpenChange={onDeleteLeaveTypeDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedLeaveType?.name}"? This action cannot be undone.
              Existing leave requests using this type may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDeleteLeaveType}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLeaveTypePending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
