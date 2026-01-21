import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest, LeaveType, LeaveStatus } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
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

export function useLeaveRequests() {
  const { role, user } = useAuth();
  
  return useQuery({
    queryKey: ['leave-requests', role, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employee:profiles!leave_requests_employee_id_fkey(id, first_name, last_name, email, department_id),
          leave_type:leave_types(*)
        `)
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: {
      leave_type_id: string;
      start_date: string;
      end_date: string;
      days_count: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...request,
          employee_id: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit leave request: ' + error.message);
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject'; rejectionReason?: string }) => {
      let updateData: Record<string, unknown> = {};
      
      if (action === 'reject') {
        updateData = {
          status: 'rejected' as LeaveStatus,
          rejected_by: user!.id,
          rejected_at: new Date().toISOString(),
        };
      } else if (role === 'manager') {
        updateData = {
          status: 'manager_approved' as LeaveStatus,
          manager_approved_by: user!.id,
          manager_approved_at: new Date().toISOString(),
        };
      } else if (role === 'hr' || role === 'admin') {
        updateData = {
          status: 'hr_approved' as LeaveStatus,
          hr_approved_by: user!.id,
          hr_approved_at: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success(variables.action === 'approve' ? 'Leave request approved' : 'Leave request rejected');
    },
    onError: (error: Error) => {
      toast.error('Failed to process leave request: ' + error.message);
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' as LeaveStatus })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request cancelled');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel leave request: ' + error.message);
    },
  });
}
