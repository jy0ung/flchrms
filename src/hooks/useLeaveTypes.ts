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
