import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { LeaveRequest } from '@/types/hrms';
import {
  canEvaluateLeaveSla,
  evaluateLeaveRequestSla,
  type LeaveSlaDecisionEvent,
  type LeaveSlaServiceLevel,
} from '@/lib/leave-sla';

type PendingLeaveRequestRow = Pick<
  LeaveRequest,
  'id' | 'employee_id' | 'status' | 'created_at' | 'policy_version_id' | 'approval_route_snapshot'
> & {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

export interface LeaveSlaMonitorItem {
  requestId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  status: LeaveRequest['status'];
  stage: 'manager' | 'general_manager' | 'director';
  stageEnteredAt: string;
  elapsedHours: number;
  targetHours: number | null;
  remainingHours: number | null;
  breached: boolean;
  atRisk: boolean;
  escalationToStage: 'manager' | 'general_manager' | 'director' | null;
  policySetId: string | null;
}

export interface LeaveSlaMonitorSummary {
  pendingCount: number;
  breachedCount: number;
  atRiskCount: number;
  noTargetCount: number;
  averageElapsedHours: number;
  byStage: Array<{
    stage: 'manager' | 'general_manager' | 'director';
    pending: number;
    breached: number;
    atRisk: number;
  }>;
}

interface LeaveSlaMonitorResult {
  items: LeaveSlaMonitorItem[];
  summary: LeaveSlaMonitorSummary;
}

function buildSummary(items: LeaveSlaMonitorItem[]): LeaveSlaMonitorSummary {
  const pendingCount = items.length;
  const breachedCount = items.filter((item) => item.breached).length;
  const atRiskCount = items.filter((item) => item.atRisk).length;
  const noTargetCount = items.filter((item) => item.targetHours == null).length;
  const averageElapsedHours =
    pendingCount === 0
      ? 0
      : Math.round((items.reduce((acc, item) => acc + item.elapsedHours, 0) / pendingCount) * 100) / 100;

  const byStage = (['manager', 'general_manager', 'director'] as const).map((stage) => {
    const stageItems = items.filter((item) => item.stage === stage);
    return {
      stage,
      pending: stageItems.length,
      breached: stageItems.filter((item) => item.breached).length,
      atRisk: stageItems.filter((item) => item.atRisk).length,
    };
  });

  return {
    pendingCount,
    breachedCount,
    atRiskCount,
    noTargetCount,
    averageElapsedHours,
    byStage,
  };
}

export function useLeaveSlaMonitor() {
  const { role, user } = useAuth();

  const query = useQuery({
    queryKey: ['leave-sla-monitor', role, user?.id],
    enabled: Boolean(user?.id && role && role !== 'employee'),
    queryFn: async (): Promise<LeaveSlaMonitorResult> => {
      const { data: requestsData, error: requestsError } = await supabase
        .from('leave_requests')
        .select(
          `
          id,
          employee_id,
          status,
          created_at,
          policy_version_id,
          approval_route_snapshot,
          employee:profiles!leave_requests_employee_id_fkey(id, first_name, last_name, email)
        `,
        )
        .in('status', ['pending', 'manager_approved', 'gm_approved'])
        .order('created_at', { ascending: true })
        .limit(500);

      if (requestsError) throw requestsError;
      const requestRows = (requestsData ?? []) as PendingLeaveRequestRow[];

      const slaCandidates = requestRows.filter((request) => canEvaluateLeaveSla(request));
      if (slaCandidates.length === 0) {
        return {
          items: [],
          summary: buildSummary([]),
        };
      }

      const requestIds = slaCandidates.map((request) => request.id);

      const { data: decisionData, error: decisionError } = await supabase
        .from('leave_request_decisions')
        .select('leave_request_id, decided_at, to_status, to_cancellation_status')
        .in('leave_request_id', requestIds)
        .order('decided_at', { ascending: false });

      if (decisionError) throw decisionError;
      const decisions = (decisionData ?? []) as LeaveSlaDecisionEvent[];

      const policyVersionIds = Array.from(
        new Set(
          slaCandidates
            .map((request) => request.policy_version_id)
            .filter((policyVersionId): policyVersionId is string => Boolean(policyVersionId)),
        ),
      );

      const policySetByVersionId: Record<string, string> = {};
      if (policyVersionIds.length > 0) {
        const { data: versionsData, error: versionsError } = await supabase
          .from('leave_policy_versions')
          .select('id, policy_set_id')
          .in('id', policyVersionIds);
        if (versionsError) throw versionsError;

        (versionsData ?? []).forEach((version) => {
          policySetByVersionId[version.id] = version.policy_set_id;
        });
      }

      const { data: serviceLevelsData, error: serviceLevelsError } = await supabase
        .from('leave_service_levels')
        .select('policy_set_id, workflow_stage, target_hours, escalation_to_stage');

      if (serviceLevelsError) throw serviceLevelsError;
      const serviceLevels = ((serviceLevelsData ?? []) as LeaveSlaServiceLevel[]).filter(
        (level) =>
          (level.workflow_stage === 'manager' ||
            level.workflow_stage === 'general_manager' ||
            level.workflow_stage === 'director') &&
          level.target_hours > 0,
      );

      const now = new Date();
      const items: LeaveSlaMonitorItem[] = slaCandidates
        .map((request) => {
          const evaluation = evaluateLeaveRequestSla(request, decisions, serviceLevels, policySetByVersionId, now);
          if (!evaluation) return null;

          const firstName = request.employee?.first_name ?? '';
          const lastName = request.employee?.last_name ?? '';
          const employeeName = `${firstName} ${lastName}`.trim() || request.employee?.email || request.employee_id;

          return {
            requestId: request.id,
            employeeId: request.employee_id,
            employeeName,
            employeeEmail: request.employee?.email ?? '',
            status: request.status,
            stage: evaluation.stage,
            stageEnteredAt: evaluation.stageEnteredAt,
            elapsedHours: evaluation.elapsedHours,
            targetHours: evaluation.targetHours,
            remainingHours: evaluation.remainingHours,
            breached: evaluation.breached,
            atRisk: evaluation.atRisk,
            escalationToStage: evaluation.escalationToStage,
            policySetId: evaluation.policySetId,
          } satisfies LeaveSlaMonitorItem;
        })
        .filter((item): item is LeaveSlaMonitorItem => item !== null)
        .sort((a, b) => {
          if (a.breached !== b.breached) return a.breached ? -1 : 1;
          if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
          return b.elapsedHours - a.elapsedHours;
        });

      return {
        items,
        summary: buildSummary(items),
      };
    },
  });

  const result = useMemo(() => {
    return (
      query.data ?? {
        items: [],
        summary: buildSummary([]),
      }
    );
  }, [query.data]);

  return {
    ...query,
    ...result,
  };
}
