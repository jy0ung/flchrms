import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Department } from '@/types/hrms';
import { toast } from 'sonner';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(*)
        `)
        .order('first_name');
      
      if (error) throw error;
      return data as (Profile & { department: Department | null })[];
    },
    staleTime: 60000, // Cache for 1 minute to reduce refetches
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          department:departments!profiles_department_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Profile & { department: Department | null };
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
      toast.error('Failed to create department: ' + error.message);
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
      toast.error('Failed to update department: ' + error.message);
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
      toast.error('Failed to delete department: ' + error.message);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
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
      toast.error('Failed to update profile: ' + error.message);
    },
  });
}

// Silent batch update - no toast notifications for individual updates
export function useBatchUpdateProfiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
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
