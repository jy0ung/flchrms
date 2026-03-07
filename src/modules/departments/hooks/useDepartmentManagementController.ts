import { useState } from 'react';

import type { AdminDepartmentForm } from '@/components/admin/admin-form-types';
import {
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
} from '@/hooks/useEmployees';
import type { Department } from '@/types/hrms';

export interface DepartmentManagementController {
  createDeptDialogOpen: boolean;
  setCreateDeptDialogOpen: (open: boolean) => void;
  editDepartmentDialogOpen: boolean;
  setEditDepartmentDialogOpen: (open: boolean) => void;
  deleteDepartmentDialogOpen: boolean;
  setDeleteDepartmentDialogOpen: (open: boolean) => void;
  newDeptName: string;
  setNewDeptName: (value: string) => void;
  newDeptDescription: string;
  setNewDeptDescription: (value: string) => void;
  selectedDepartment: Department | null;
  departmentForm: AdminDepartmentForm;
  setDepartmentForm: (next: AdminDepartmentForm) => void;
  handleCreateDepartment: () => Promise<void>;
  handleEditDepartment: (department: Department) => void;
  handleSaveDepartment: () => Promise<void>;
  openDeleteDepartmentDialog: (department: Department) => void;
  handleDeleteDepartment: () => Promise<void>;
  createDepartmentPending: boolean;
  updateDepartmentPending: boolean;
  deleteDepartmentPending: boolean;
}

export function useDepartmentManagementController(): DepartmentManagementController {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment();

  const [createDeptDialogOpen, setCreateDeptDialogOpen] = useState(false);
  const [editDepartmentDialogOpen, setEditDepartmentDialogOpen] = useState(false);
  const [deleteDepartmentDialogOpen, setDeleteDepartmentDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState<AdminDepartmentForm>({
    name: '',
    description: '',
  });

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;

    await createDepartment.mutateAsync({
      name: newDeptName.trim(),
      description: newDeptDescription.trim() || null,
    });

    setCreateDeptDialogOpen(false);
    setNewDeptName('');
    setNewDeptDescription('');
  };

  const handleEditDepartment = (department: Department) => {
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

  const openDeleteDepartmentDialog = (department: Department) => {
    setSelectedDepartment(department);
    setDeleteDepartmentDialogOpen(true);
  };

  const handleDeleteDepartment = async () => {
    if (!selectedDepartment) return;

    await deleteDepartment.mutateAsync(selectedDepartment.id);
    setDeleteDepartmentDialogOpen(false);
    setSelectedDepartment(null);
  };

  return {
    createDeptDialogOpen,
    setCreateDeptDialogOpen,
    editDepartmentDialogOpen,
    setEditDepartmentDialogOpen,
    deleteDepartmentDialogOpen,
    setDeleteDepartmentDialogOpen,
    newDeptName,
    setNewDeptName,
    newDeptDescription,
    setNewDeptDescription,
    selectedDepartment,
    departmentForm,
    setDepartmentForm,
    handleCreateDepartment,
    handleEditDepartment,
    handleSaveDepartment,
    openDeleteDepartmentDialog,
    handleDeleteDepartment,
    createDepartmentPending: createDepartment.isPending,
    updateDepartmentPending: updateDepartment.isPending,
    deleteDepartmentPending: deleteDepartment.isPending,
  };
}
