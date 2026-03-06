import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import type { LeaveBalanceAdjustmentEntry } from '@/types/hrms';

export interface LeaveBalanceAdjustmentFilters {
  leaveTypeId?: string | null;
  from?: string | null;
  to?: string | null;
}

export const LEAVE_BALANCE_ADJUSTMENTS_QUERY_KEY = ['leave-balance-adjustments'] as const;

function normalizeAdjustmentRows(rows: unknown): LeaveBalanceAdjustmentEntry[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const payload = (row ?? {}) as Record<string, unknown>;
    return {
      id: String(payload.id ?? ''),
      employee_id: String(payload.employee_id ?? ''),
      leave_type_id: String(payload.leave_type_id ?? ''),
      leave_type_name: String(payload.leave_type_name ?? ''),
      adjustment_days: Number(payload.adjustment_days ?? 0),
      effective_date: String(payload.effective_date ?? ''),
      reason: String(payload.reason ?? ''),
      created_by: String(payload.created_by ?? ''),
      created_by_name:
        typeof payload.created_by_name === 'string' && payload.created_by_name.trim().length > 0
          ? payload.created_by_name
          : null,
      metadata:
        payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
          ? (payload.metadata as Record<string, unknown>)
          : {},
      created_at: String(payload.created_at ?? ''),
    };
  });
}

export function useLeaveBalanceAdjustments(
  employeeId?: string | null,
  filters?: LeaveBalanceAdjustmentFilters,
) {
  return useQuery({
    queryKey: [
      ...LEAVE_BALANCE_ADJUSTMENTS_QUERY_KEY,
      employeeId ?? null,
      filters?.leaveTypeId ?? null,
      filters?.from ?? null,
      filters?.to ?? null,
    ],
    enabled: Boolean(employeeId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await untypedRpc('get_leave_balance_adjustments', {
        _employee_id: employeeId,
        _leave_type_id: filters?.leaveTypeId ?? null,
        _from: filters?.from ?? null,
        _to: filters?.to ?? null,
      });

      if (error) throw error;
      return normalizeAdjustmentRows(data);
    },
  });
}

export function useCreateLeaveBalanceAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      employeeId: string;
      leaveTypeId: string;
      adjustmentDays: number;
      effectiveDate: string;
      reason: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await untypedRpc('create_leave_balance_adjustment', {
        _employee_id: input.employeeId,
        _leave_type_id: input.leaveTypeId,
        _adjustment_days: input.adjustmentDays,
        _effective_date: input.effectiveDate,
        _reason: input.reason,
        _metadata: input.metadata ?? {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      queryClient.invalidateQueries({ queryKey: LEAVE_BALANCE_ADJUSTMENTS_QUERY_KEY });
      toast.success('Leave balance adjustment created');
    },
    onError: (error) => {
      toast.error('Failed to create leave balance adjustment', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}
