import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { Profile, Department } from '@/types/hrms';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';

type ProfileUpdateInput = Partial<Profile> & { username?: string | null };
type EmployeeDirectoryProfileRow =
  Database['public']['Functions']['get_employee_directory_profiles']['Returns'][number];

function parseDepartment(value: Json | null): Department | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as unknown as Department;
}

function mapEmployeeDirectoryProfileRow(
  row: EmployeeDirectoryProfileRow,
): Profile & { department: Department | null } {
  return {
    id: row.id,
    employee_id: row.employee_id,
    email: row.email,
    username: row.username,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    department_id: row.department_id,
    job_title: row.job_title,
    hire_date: row.hire_date,
    manager_id: row.manager_id,
    status: (row.status ?? 'active') as Profile['status'],
    created_at: row.created_at,
    updated_at: row.updated_at,
    department: parseDepartment(row.department),
  };
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employee_directory_profiles');

      if (error) throw error;
      return (data ?? []).map(mapEmployeeDirectoryProfileRow);
    },
    staleTime: 60000, // Cache for 1 minute to reduce refetches
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employee_directory_profiles', {
        _profile_id: id,
      });

      if (error) throw error;
      const row = data?.[0];
      if (!row) {
        throw new Error('Employee profile not found.');
      }
      return mapEmployeeDirectoryProfileRow(row);
    },
    enabled: !!id,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Department[];
    },
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name, description: description || null })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Department created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create department', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Pick<Department, 'name' | 'description'>;
    }) => {
      const { data, error } = await supabase
        .from('departments')
        .update({
          name: updates.name.trim(),
          description: updates.description || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Department updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update department', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentId: string) => {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', departmentId);

      if (countError) throw countError;

      if ((count || 0) > 0) {
        throw new Error('Department cannot be deleted while employees are assigned to it.');
      }

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', departmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete department', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProfileUpdateInput }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update profile', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useAdminResetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { error } = await supabase.rpc('admin_reset_user_password', {
        _target_user_id: userId,
        _new_password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Password reset successfully. Existing sessions were signed out.');
    },
    onError: (error: Error) => {
      toast.error('Failed to reset password', { description: sanitizeErrorMessage(error) });
    },
  });
}

export interface CreateEmployeeInput {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  job_title?: string | null;
  department_id?: string | null;
  hire_date?: string | null;
  manager_id?: string | null;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      const { data, error } = await supabase.rpc('admin_create_employee', {
        _email: input.email.trim(),
        _password: input.password,
        _first_name: input.first_name.trim(),
        _last_name: input.last_name.trim(),
        _phone: input.phone || null,
        _job_title: input.job_title || null,
        _department_id: input.department_id || null,
        _hire_date: input.hire_date || null,
        _manager_id: input.manager_id || null,
      } as Record<string, unknown>);

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created successfully. They can sign in with the temporary password.');
    },
    onError: (error: Error) => {
      toast.error('Failed to create employee', { description: sanitizeErrorMessage(error) });
    },
  });
}

export interface ProfileChangeLogEntry {
  id: string;
  profile_id: string;
  changed_by: string | null;
  changed_at: string;
  change_type: 'create' | 'update' | 'archive' | 'restore';
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
}

export function useProfileChangeLog(profileId: string | null) {
  return useQuery({
    queryKey: ['profile-change-log', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_change_log')
        .select('*')
        .eq('profile_id', profileId!)
        .order('changed_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as ProfileChangeLogEntry[];
    },
    enabled: !!profileId,
    staleTime: 30000,
  });
}

// Silent batch update - no toast notifications for individual updates
export function useBatchUpdateProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProfileUpdateInput }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
    },
  });
}