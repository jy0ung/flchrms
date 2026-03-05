import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import type { LeavePolicyDecision, LeavePreviewResult } from '@/types/hrms';

type RpcErrorLike = {
  message?: string;
};

type RpcResult<T> = {
  data: T | null;
  error: RpcErrorLike | null;
};

type UntypedRpcClient = {
  rpc: <T = unknown>(fn: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

const rpcClient = supabase as unknown as UntypedRpcClient;

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function normalizePreviewResult(data: unknown): LeavePreviewResult {
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    can_submit: Boolean(payload.can_submit),
    employee_id: String(payload.employee_id ?? ''),
    leave_type_id: String(payload.leave_type_id ?? ''),
    leave_type_name: payload.leave_type_name ? String(payload.leave_type_name) : null,
    start_date: String(payload.start_date ?? ''),
    end_date: String(payload.end_date ?? ''),
    requested_units: Number(payload.requested_units ?? 0),
    policy_version_id: payload.policy_version_id ? String(payload.policy_version_id) : null,
    rule_unit: (payload.rule_unit as LeavePreviewResult['rule_unit']) ?? 'day',
    requires_document: Boolean(payload.requires_document),
    allow_negative_balance: Boolean(payload.allow_negative_balance),
    max_consecutive_days:
      payload.max_consecutive_days === null || payload.max_consecutive_days === undefined
        ? null
        : Number(payload.max_consecutive_days),
    min_notice_days: Number(payload.min_notice_days ?? 0),
    entitled_balance: Number(payload.entitled_balance ?? 0),
    consumed_balance: Number(payload.consumed_balance ?? 0),
    pending_balance: Number(payload.pending_balance ?? 0),
    available_balance: Number(payload.available_balance ?? 0),
    balance_source: String(payload.balance_source ?? 'legacy_leave_requests'),
    hard_errors: toStringArray(payload.hard_errors),
    soft_warnings: toStringArray(payload.soft_warnings),
    reason: payload.reason ? String(payload.reason) : null,
  };
}

export function useLeavePreviewRequest() {
  return useMutation({
    mutationFn: async (input: {
      employeeId: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      daysCount?: number;
      reason?: string;
      requestId?: string;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_preview_request', {
        _employee_id: input.employeeId,
        _leave_type_id: input.leaveTypeId,
        _start_date: input.startDate,
        _end_date: input.endDate,
        _days_count: input.daysCount ?? null,
        _reason: input.reason ?? null,
        _request_id: input.requestId ?? null,
      });

      if (error) throw error;
      return normalizePreviewResult(data);
    },
    onError: (error) => {
      toast.error('Failed to preview leave request', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}

export function useLeaveRequestV2(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ['leave-request-v2', requestId],
    enabled: Boolean(requestId),
    queryFn: async () => {
      const { data, error } = await rpcClient.rpc<{
        request: Record<string, unknown>;
        decisions: LeavePolicyDecision[];
      }>('leave_get_request_v2', { _request_id: requestId });

      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveBalanceV2(asOfDate?: string) {
  return useQuery({
    queryKey: ['leave-balance-v2', asOfDate ?? null],
    queryFn: async () => {
      const { data, error } = await rpcClient.rpc<
        Array<{
          leave_type_id: string;
          leave_type_name: string;
          entitled: number;
          consumed: number;
          pending: number;
          available: number;
          source: string;
          as_of_date: string;
        }>
      >('leave_get_my_balance_v2', { _as_of: asOfDate ?? null });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRunLeaveAccrualCycle() {
  return useMutation({
    mutationFn: async (input: {
      asOfDate?: string;
      employeeId?: string | null;
      dryRun?: boolean;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_run_accrual_cycle', {
        _as_of: input.asOfDate ?? null,
        _employee_id: input.employeeId ?? null,
        _dry_run: input.dryRun ?? false,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveClosePeriod() {
  return useMutation({
    mutationFn: async (input: {
      periodStart: string;
      periodEnd: string;
      notes?: string;
      dryRun?: boolean;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_close_period', {
        _period_start: input.periodStart,
        _period_end: input.periodEnd,
        _notes: input.notes ?? null,
        _dry_run: input.dryRun ?? true,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useLeaveExportPayrollInputs() {
  return useMutation({
    mutationFn: async (input: {
      periodStart: string;
      periodEnd: string;
      dryRun?: boolean;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_export_payroll_inputs', {
        _period_start: input.periodStart,
        _period_end: input.periodEnd,
        _dry_run: input.dryRun ?? true,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useRunLeaveSlaEscalation() {
  return useMutation({
    mutationFn: async (input?: {
      asOf?: string;
      dryRun?: boolean;
      maxRows?: number;
      runTag?: string;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_run_sla_escalation', {
        _as_of: input?.asOf ?? null,
        _dry_run: input?.dryRun ?? true,
        _max_rows: input?.maxRows ?? 200,
        _run_tag: input?.runTag ?? null,
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      toast.error('Failed to run leave SLA escalation', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}
