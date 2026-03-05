import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/** Returns the fiscal year start date (January 1 of current year). */
function getFiscalYearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  days_allowed: number;
  days_used: number;
  days_pending: number;
  days_remaining: number;
}

type RpcErrorLike = {
  message?: string;
  code?: string;
};

type RpcResult<T> = {
  data: T | null;
  error: RpcErrorLike | null;
};

type UntypedRpcClient = {
  rpc: <T = unknown>(fn: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

const rpcClient = supabase as unknown as UntypedRpcClient;

function isMissingBalanceRpc(error: RpcErrorLike | null): boolean {
  if (!error) return false;
  const raw = error.message ?? '';
  return (
    error.code === '42883' ||
    /could not find the function/i.test(raw) ||
    /leave_get_my_balance_v2/i.test(raw)
  );
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

      // Prefer server-side policy/balance engine for self-balance when available.
      if (targetId === user?.id) {
        const { data: v2Balances, error: v2Error } = await rpcClient.rpc<
          Array<{
            leave_type_id: string;
            leave_type_name: string;
            entitled: number;
            consumed: number;
            pending: number;
            available: number;
          }>
        >('leave_get_my_balance_v2', { _as_of: null });

        if (!v2Error && v2Balances) {
          const byType = new Map(v2Balances.map((entry) => [entry.leave_type_id, entry]));
          return leaveTypes.map((type) => {
            const v2 = byType.get(type.id);
            if (!v2) {
              return {
                leave_type_id: type.id,
                leave_type_name: type.name,
                days_allowed: type.days_allowed,
                days_used: 0,
                days_pending: 0,
                days_remaining: type.days_allowed,
              };
            }

            return {
              leave_type_id: type.id,
              leave_type_name: type.name,
              days_allowed: Number(v2.entitled ?? type.days_allowed),
              days_used: Number(v2.consumed ?? 0),
              days_pending: Number(v2.pending ?? 0),
              days_remaining: Number(v2.available ?? 0),
            };
          });
        }

        if (v2Error && !isMissingBalanceRpc(v2Error)) {
          throw v2Error;
        }
      }

      // Fetch approved leave requests for this employee (current fiscal year only)
      const fiscalYearStart = getFiscalYearStart();
      const { data: approvedRequests, error: approvedError } = await supabase
        .from('leave_requests')
        .select('leave_type_id, days_count')
        .eq('employee_id', targetId!)
        .not('final_approved_at', 'is', null)
        .not('status', 'in', '(cancelled,rejected)')
        .gte('start_date', fiscalYearStart);

      if (approvedError) throw approvedError;

      // Fetch pending leave requests (current fiscal year only)
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('leave_requests')
        .select('leave_type_id, days_count')
        .eq('employee_id', targetId!)
        .is('final_approved_at', null)
        .not('status', 'in', '(rejected,cancelled)')
        .gte('start_date', fiscalYearStart);

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
          days_remaining: Math.max(0, type.days_allowed - usedDays - pendingDays),
        };
      });

      return balances;
    },
    enabled: !!targetId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
