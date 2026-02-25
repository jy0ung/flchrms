import { useState } from 'react';
import {
  useCreateLeaveType,
  useDeleteLeaveType,
  useUpdateLeaveType,
} from '@/hooks/useLeaveTypes';
import type { LeaveType } from '@/types/hrms';
import type { AdminLeaveTypeForm } from '@/components/admin/admin-form-types';

const defaultLeaveTypeForm = (): AdminLeaveTypeForm => ({
  name: '',
  description: '',
  days_allowed: 0,
  min_days: 0,
  is_paid: true,
  requires_document: false,
});

export function useAdminLeaveTypeManagement() {
  const updateLeaveType = useUpdateLeaveType();
  const createLeaveType = useCreateLeaveType();
  const deleteLeaveType = useDeleteLeaveType();

  const [editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen] = useState(false);
  const [createLeaveTypeDialogOpen, setCreateLeaveTypeDialogOpen] = useState(false);
  const [deleteLeaveTypeDialogOpen, setDeleteLeaveTypeDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [leaveTypeForm, setLeaveTypeForm] = useState<AdminLeaveTypeForm>(defaultLeaveTypeForm);

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
    setLeaveTypeForm(defaultLeaveTypeForm());
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

  return {
    editLeaveTypeDialogOpen,
    setEditLeaveTypeDialogOpen,
    createLeaveTypeDialogOpen,
    setCreateLeaveTypeDialogOpen,
    deleteLeaveTypeDialogOpen,
    setDeleteLeaveTypeDialogOpen,
    selectedLeaveType,
    leaveTypeForm,
    setLeaveTypeForm,
    handleEditLeaveType,
    handleCreateLeaveType,
    handleSaveNewLeaveType,
    handleSaveLeaveType,
    handleDeleteLeaveType,
    openDeleteLeaveTypeDialog,
    updateLeaveTypePending: updateLeaveType.isPending,
    createLeaveTypePending: createLeaveType.isPending,
    deleteLeaveTypePending: deleteLeaveType.isPending,
  };
}
