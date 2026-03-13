import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const LEAVE_UNLIMITED_SENTINEL = 999999;

export interface LeaveBalance {
  leave_type_id: string;
  leave_type_name: string;
  days_allowed: number;
  days_used: number;
  days_pending: number;
  days_remaining: number;
  annual_entitlement: number;
  auto_accrued_days: number;
  manual_adjustment_days: number;
  entitled_days: number;
  is_unlimited: boolean;
  cycle_start: string;
  cycle_end: string;
  source: string;
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

type BalanceRpcRow = {
  leave_type_id: string;
  leave_type_name: string;
  annual_entitlement: number;
  auto_accrued_days: number;
  manual_adjustment_days: number;
  entitled_days: number;
  days_used: number;
  days_pending: number;
  days_remaining: number;
  is_unlimited: boolean;
  cycle_start: string;
  cycle_end: string;
  source: string;
};

function isMissingBalanceRpc(error: RpcErrorLike | null): boolean {
  if (!error) return false;
  const raw = error.message ?? '';
  return (
    error.code === '42883' ||
    /could not find the function/i.test(raw) ||
    /get_employee_leave_balances/i.test(raw) ||
    /leave_get_my_balance_v2/i.test(raw)
  );
}

function mapBalanceRows(rows: BalanceRpcRow[]): LeaveBalance[] {
  return rows.map((row) => {
    const annualEntitlement = Number(row.annual_entitlement ?? 0);
    const isUnlimited = Boolean(row.is_unlimited);
    const daysRemaining = isUnlimited
      ? LEAVE_UNLIMITED_SENTINEL
      : Number(row.days_remaining ?? 0);

    return {
      leave_type_id: row.leave_type_id,
      leave_type_name: row.leave_type_name,
      days_allowed: annualEntitlement,
      days_used: Number(row.days_used ?? 0),
      days_pending: Number(row.days_pending ?? 0),
      days_remaining: daysRemaining,
      annual_entitlement: annualEntitlement,
      auto_accrued_days: Number(row.auto_accrued_days ?? 0),
      manual_adjustment_days: Number(row.manual_adjustment_days ?? 0),
      entitled_days: Number(row.entitled_days ?? 0),
      is_unlimited: isUnlimited,
      cycle_start: row.cycle_start,
      cycle_end: row.cycle_end,
      source: row.source ?? 'proration_adjustment_v1',
    };
  });
}

function inferCycleBounds(asOfDate?: string | null) {
  const date = asOfDate ? new Date(asOfDate) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  return {
    cycle_start: `${year}-01-01`,
    cycle_end: `${year}-12-31`,
  };
}

interface UseLeaveBalanceOptions {
  enabled?: boolean;
}

export function useLeaveBalance(employeeId?: string, asOfDate?: string, options?: UseLeaveBalanceOptions) {
  const { user } = useAuth();
  const targetId = employeeId || user?.id;
  const queryEnabled = options?.enabled ?? !!targetId;

  return useQuery({
    queryKey: ['leave-balance', targetId, asOfDate ?? null],
    queryFn: async () => {
      if (!targetId) {
        throw new Error('Missing employee id for leave balance query.');
      }

      const { data: balancesData, error: balancesError } = await rpcClient.rpc<BalanceRpcRow[]>(
        'get_employee_leave_balances',
        {
          _employee_id: targetId,
          _as_of_date: asOfDate ?? null,
        },
      );

      if (!balancesError && balancesData) {
        return mapBalanceRows(balancesData);
      }

      if (balancesError && !isMissingBalanceRpc(balancesError)) {
        throw balancesError;
      }

      // Fallback for environments that still only have the legacy v2 RPC.
      if (targetId === user?.id) {
        const { data: v2Balances, error: v2Error } = await rpcClient.rpc<
          Array<{
            leave_type_id: string;
            leave_type_name: string;
            entitled: number;
            consumed: number;
            pending: number;
            available: number;
            source?: string;
          }>
        >('leave_get_my_balance_v2', { _as_of: asOfDate ?? null });

        if (v2Error) throw v2Error;
        const cycle = inferCycleBounds(asOfDate);

        return (v2Balances ?? []).map((entry) => {
          const entitled = Number(entry.entitled ?? 0);
          const available = Number(entry.available ?? 0);
          const isUnlimited =
            available >= LEAVE_UNLIMITED_SENTINEL ||
            (entitled === 0 && available > 365);

          return {
            leave_type_id: entry.leave_type_id,
            leave_type_name: entry.leave_type_name,
            days_allowed: isUnlimited ? 0 : entitled,
            days_used: Number(entry.consumed ?? 0),
            days_pending: Number(entry.pending ?? 0),
            days_remaining: isUnlimited ? LEAVE_UNLIMITED_SENTINEL : available,
            annual_entitlement: isUnlimited ? 0 : entitled,
            auto_accrued_days: isUnlimited ? 0 : entitled,
            manual_adjustment_days: 0,
            entitled_days: entitled,
            is_unlimited: isUnlimited,
            cycle_start: cycle.cycle_start,
            cycle_end: cycle.cycle_end,
            source: entry.source ?? 'legacy_leave_get_my_balance_v2',
          };
        });
      }

      throw balancesError;
    },
    enabled: queryEnabled && !!targetId,
    staleTime: 30000, // Cache for 30 seconds
  });
}
