import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  days_allowed: number;
  days_used: number;
  days_pending: number;
  days_remaining: number;
}

export function useLeaveBalance(employeeId?: string) {
  const { user } = useAuth();
  const targetId = employeeId || user?.id;

  return useQuery({
    queryKey: ['leave-balance', targetId],
    queryFn: async () => {
      // Fetch leave types
      const { data: leaveTypes, error: typesError } = await supabase
        .from('leave_types')
        .select('id, name, days_allowed');

      if (typesError) throw typesError;

      // Fetch approved leave requests for this employee
      const { data: approvedRequests, error: approvedError } = await supabase
        .from('leave_requests')
        .select('leave_type_id, days_count')
        .eq('employee_id', targetId!)
        .eq('status', 'hr_approved');

      if (approvedError) throw approvedError;

      // Fetch pending leave requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('leave_requests')
        .select('leave_type_id, days_count')
        .eq('employee_id', targetId!)
        .in('status', ['pending', 'manager_approved']);

      if (pendingError) throw pendingError;

      // Calculate balances
      const balances: LeaveBalance[] = leaveTypes.map(type => {
        const usedDays = approvedRequests
          .filter(r => r.leave_type_id === type.id)
          .reduce((sum, r) => sum + r.days_count, 0);

        const pendingDays = pendingRequests
          .filter(r => r.leave_type_id === type.id)
          .reduce((sum, r) => sum + r.days_count, 0);

        return {
          leave_type_id: type.id,
          leave_type_name: type.name,
          days_allowed: type.days_allowed,
          days_used: usedDays,
          days_pending: pendingDays,
          days_remaining: type.days_allowed - usedDays,
        };
      });

      return balances;
    },
    enabled: !!targetId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
