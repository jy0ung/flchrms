import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveType } from '@/types/hrms';
import { toast } from 'sonner';

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as LeaveType[];
    },
  });
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLeaveType: {
      name: string;
      description?: string | null;
      days_allowed: number;
      min_days: number;
      is_paid: boolean;
      requires_document: boolean;
    }) => {
      const { data, error } = await supabase
        .from('leave_types')
        .insert({
          name: newLeaveType.name,
          description: newLeaveType.description || null,
          days_allowed: newLeaveType.days_allowed,
          min_days: newLeaveType.min_days,
          is_paid: newLeaveType.is_paid,
          requires_document: newLeaveType.requires_document,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success('Leave type created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create leave type: ' + error.message);
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Pick<LeaveType, 'name' | 'description' | 'days_allowed' | 'is_paid' | 'min_days' | 'requires_document'>> 
    }) => {
      const { data, error } = await supabase
        .from('leave_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success('Leave policy updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update leave policy: ' + error.message);
    },
  });
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-types'] });
      toast.success('Leave type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete leave type: ' + error.message);
    },
  });
}
