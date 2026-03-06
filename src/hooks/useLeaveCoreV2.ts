import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import type {
  LeaveAccrualScenarioSimulationResult,
  LeaveCountryPackContext,
  LeaveForecastResult,
  LeaveLiabilitySnapshotResult,
  LeavePolicyChangeSimulationResult,
  LeavePolicyDecision,
  LeavePreviewResult,
} from '@/types/hrms';

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
    is_unlimited: Boolean(payload.is_unlimited),
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

function normalizeLiabilitySnapshotResult(data: unknown): LeaveLiabilitySnapshotResult {
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    as_of: String(payload.as_of ?? ''),
    policy_version_id: String(payload.policy_version_id ?? ''),
    dry_run: Boolean(payload.dry_run),
    planned_rows: Number(payload.planned_rows ?? 0),
    written_rows: Number(payload.written_rows ?? 0),
    total_days: Number(payload.total_days ?? 0),
    estimated_amount: Number(payload.estimated_amount ?? 0),
    currency_code: String(payload.currency_code ?? 'MYR'),
    scope: (payload.scope as Record<string, unknown> | null) ?? {},
    run_tag: payload.run_tag ? String(payload.run_tag) : null,
  };
}

function normalizeForecastResult(data: unknown): LeaveForecastResult {
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    forecast_run_id: payload.forecast_run_id ? String(payload.forecast_run_id) : null,
    as_of: String(payload.as_of ?? ''),
    horizon_months: Number(payload.horizon_months ?? 0),
    policy_version_id: String(payload.policy_version_id ?? ''),
    dry_run: Boolean(payload.dry_run),
    employees: Number(payload.employees ?? 0),
    planned_rows: Number(payload.planned_rows ?? 0),
    written_rows: Number(payload.written_rows ?? 0),
    total_projected_days: Number(payload.total_projected_days ?? 0),
    total_projected_amount: Number(payload.total_projected_amount ?? 0),
    currency_code: String(payload.currency_code ?? 'MYR'),
    scope: (payload.scope as Record<string, unknown> | null) ?? {},
    run_tag: payload.run_tag ? String(payload.run_tag) : null,
  };
}

function normalizePolicyChangeSimulationResult(data: unknown): LeavePolicyChangeSimulationResult {
  const payload = (data ?? {}) as Record<string, unknown>;
  const monthly = Array.isArray(payload.monthly_delta)
    ? payload.monthly_delta.map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        return {
          month_start: String(row.month_start ?? ''),
          baseline_days: Number(row.baseline_days ?? 0),
          simulated_days: Number(row.simulated_days ?? 0),
          delta_days: Number(row.delta_days ?? 0),
          baseline_amount: Number(row.baseline_amount ?? 0),
          simulated_amount: Number(row.simulated_amount ?? 0),
          delta_amount: Number(row.delta_amount ?? 0),
          currency_code: String(row.currency_code ?? 'MYR'),
        };
      })
    : [];

  return {
    as_of: String(payload.as_of ?? ''),
    horizon_months: Number(payload.horizon_months ?? 0),
    dry_run: Boolean(payload.dry_run),
    policy_version_id: String(payload.policy_version_id ?? ''),
    employees: Number(payload.employees ?? 0),
    baseline_total_days: Number(payload.baseline_total_days ?? 0),
    simulated_total_days: Number(payload.simulated_total_days ?? 0),
    delta_total_days: Number(payload.delta_total_days ?? 0),
    baseline_total_amount: Number(payload.baseline_total_amount ?? 0),
    simulated_total_amount: Number(payload.simulated_total_amount ?? 0),
    delta_total_amount: Number(payload.delta_total_amount ?? 0),
    currency_code: String(payload.currency_code ?? 'MYR'),
    assumptions: (payload.assumptions as Record<string, unknown> | null) ?? {},
    monthly_delta: monthly,
    scope: (payload.scope as Record<string, unknown> | null) ?? {},
  };
}

function normalizeAccrualScenarioSimulationResult(data: unknown): LeaveAccrualScenarioSimulationResult {
  const payload = (data ?? {}) as Record<string, unknown>;
  const byType = Array.isArray(payload.by_leave_type)
    ? payload.by_leave_type.map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        return {
          leave_type_id: String(row.leave_type_id ?? ''),
          leave_type_name: String(row.leave_type_name ?? ''),
          employee_count: Number(row.employee_count ?? 0),
          baseline_units: Number(row.baseline_units ?? 0),
          simulated_units: Number(row.simulated_units ?? 0),
          delta_units: Number(row.delta_units ?? 0),
        };
      })
    : [];

  return {
    as_of: String(payload.as_of ?? ''),
    dry_run: Boolean(payload.dry_run),
    policy_version_id: String(payload.policy_version_id ?? ''),
    employees: Number(payload.employees ?? 0),
    scenario: (payload.scenario as Record<string, unknown> | null) ?? {},
    baseline_total_units: Number(payload.baseline_total_units ?? 0),
    simulated_total_units: Number(payload.simulated_total_units ?? 0),
    delta_total_units: Number(payload.delta_total_units ?? 0),
    by_leave_type: byType,
    scope: (payload.scope as Record<string, unknown> | null) ?? {},
  };
}

function normalizeCountryPackContext(data: unknown): LeaveCountryPackContext {
  const payload = (data ?? {}) as Record<string, unknown>;
  return {
    country_pack_id: payload.country_pack_id ? String(payload.country_pack_id) : null,
    country_pack_version_id: payload.country_pack_version_id ? String(payload.country_pack_version_id) : null,
    policy_set_id: String(payload.policy_set_id ?? ''),
    pack_code: String(payload.pack_code ?? ''),
    country_code: String(payload.country_code ?? 'MY'),
    legal_entity: payload.legal_entity ? String(payload.legal_entity) : null,
    location_code: payload.location_code ? String(payload.location_code) : null,
    resolved_by: String(payload.resolved_by ?? ''),
    as_of: String(payload.as_of ?? ''),
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

export function useGenerateLeaveLiabilitySnapshot() {
  return useMutation({
    mutationFn: async (input?: {
      asOf?: string;
      scope?: Record<string, unknown>;
      dryRun?: boolean;
      runTag?: string;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_generate_liability_snapshot', {
        _as_of: input?.asOf ?? null,
        _scope: input?.scope ?? {},
        _dry_run: input?.dryRun ?? true,
        _run_tag: input?.runTag ?? null,
      });

      if (error) throw error;
      return normalizeLiabilitySnapshotResult(data);
    },
    onError: (error) => {
      toast.error('Failed to generate leave liability snapshot', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}

export function useRunLeaveForecast() {
  return useMutation({
    mutationFn: async (input?: {
      asOf?: string;
      horizonMonths?: number;
      scope?: Record<string, unknown>;
      dryRun?: boolean;
      runTag?: string;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_run_forecast', {
        _as_of: input?.asOf ?? null,
        _horizon_months: input?.horizonMonths ?? 6,
        _scope: input?.scope ?? {},
        _dry_run: input?.dryRun ?? true,
        _run_tag: input?.runTag ?? null,
      });

      if (error) throw error;
      return normalizeForecastResult(data);
    },
    onError: (error) => {
      toast.error('Failed to run leave forecast', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}

export function useSimulateLeavePolicyChange() {
  return useMutation({
    mutationFn: async (input?: {
      asOf?: string;
      horizonMonths?: number;
      scope?: Record<string, unknown>;
      policyChanges?: Record<string, unknown>;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_simulate_policy_change', {
        _as_of: input?.asOf ?? null,
        _horizon_months: input?.horizonMonths ?? 6,
        _scope: input?.scope ?? {},
        _policy_changes: input?.policyChanges ?? {},
      });

      if (error) throw error;
      return normalizePolicyChangeSimulationResult(data);
    },
    onError: (error) => {
      toast.error('Failed to simulate leave policy change', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}

export function useSimulateLeaveAccrualScenario() {
  return useMutation({
    mutationFn: async (input?: {
      asOf?: string;
      scope?: Record<string, unknown>;
      scenario?: Record<string, unknown>;
    }) => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_simulate_accrual_scenario', {
        _as_of: input?.asOf ?? null,
        _scope: input?.scope ?? {},
        _scenario: input?.scenario ?? {},
      });

      if (error) throw error;
      return normalizeAccrualScenarioSimulationResult(data);
    },
    onError: (error) => {
      toast.error('Failed to simulate accrual scenario', {
        description: sanitizeErrorMessage(error),
      });
    },
  });
}

export function useLeaveCountryPackContext(input?: {
  asOf?: string;
  legalEntity?: string | null;
  locationCode?: string | null;
  countryCode?: string;
}) {
  return useQuery({
    queryKey: [
      'leave-country-pack-context',
      input?.asOf ?? null,
      input?.legalEntity ?? null,
      input?.locationCode ?? null,
      input?.countryCode ?? 'MY',
    ],
    queryFn: async () => {
      const { data, error } = await rpcClient.rpc<unknown>('leave_get_country_pack_context', {
        _as_of: input?.asOf ?? null,
        _legal_entity: input?.legalEntity ?? null,
        _location_code: input?.locationCode ?? null,
        _country_code: input?.countryCode ?? 'MY',
      });

      if (error) throw error;
      return normalizeCountryPackContext(data);
    },
  });
}
