import { useEffect, useState } from 'react';
import {
  useLeaveApprovalWorkflows,
  useResetLeaveApprovalWorkflows,
  useUpsertLeaveApprovalWorkflow,
} from '@/hooks/useLeaveApprovalWorkflows';
import {
  useLeaveCancellationWorkflows,
  useResetLeaveCancellationWorkflows,
  useUpsertLeaveCancellationWorkflow,
} from '@/hooks/useLeaveCancellationWorkflows';
import { DepartmentWorkflowBuilderCard } from '@/components/admin/DepartmentWorkflowBuilderCard';
import type { AppRole, Department, LeaveApprovalStage } from '@/types/hrms';
import {
  DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE,
  DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE,
  normalizeLeaveApprovalStages,
  normalizeLeaveCancellationApprovalStages,
} from '@/lib/leave-workflow';
import { toast } from 'sonner';

const GLOBAL_WORKFLOW_SCOPE = '__global__';
const DEPARTMENT_WORKFLOW_PROFILE_ROLE: AppRole = 'employee';

type LeaveWorkflowDraft = {
  approval_stages: LeaveApprovalStage[];
  is_active: boolean;
  notes: string;
};

interface LeaveWorkflowBuildersSectionProps {
  departments?: Department[];
}

export function LeaveWorkflowBuildersSection({ departments }: LeaveWorkflowBuildersSectionProps) {
  const { data: leaveApprovalWorkflows, isLoading: leaveApprovalWorkflowsLoading } = useLeaveApprovalWorkflows();
  const { data: leaveCancellationWorkflows, isLoading: leaveCancellationWorkflowsLoading } = useLeaveCancellationWorkflows();
  const upsertLeaveApprovalWorkflow = useUpsertLeaveApprovalWorkflow();
  const resetLeaveApprovalWorkflows = useResetLeaveApprovalWorkflows();
  const upsertLeaveCancellationWorkflow = useUpsertLeaveCancellationWorkflow();
  const resetLeaveCancellationWorkflows = useResetLeaveCancellationWorkflows();

  const [leaveWorkflowDrafts, setLeaveWorkflowDrafts] = useState<Partial<Record<AppRole, LeaveWorkflowDraft>>>({});
  const [selectedLeaveWorkflowDepartmentScope, setSelectedLeaveWorkflowDepartmentScope] = useState<string>(GLOBAL_WORKFLOW_SCOPE);
  const [leaveCancellationWorkflowDrafts, setLeaveCancellationWorkflowDrafts] = useState<Partial<Record<AppRole, LeaveWorkflowDraft>>>({});
  const [selectedLeaveCancellationWorkflowDepartmentScope, setSelectedLeaveCancellationWorkflowDepartmentScope] =
    useState<string>(GLOBAL_WORKFLOW_SCOPE);

  const scopeToDepartmentId = (scope: string) => (scope === GLOBAL_WORKFLOW_SCOPE ? null : scope);

  const getWorkflowDepartmentScopeLabel = (scope: string) => {
    if (scope === GLOBAL_WORKFLOW_SCOPE) return 'All Departments (Default)';
    return departments?.find((department) => department.id === scope)?.name || 'Selected Department';
  };

  useEffect(() => {
    const scopedDepartmentId = scopeToDepartmentId(selectedLeaveWorkflowDepartmentScope);
    const existing = (leaveApprovalWorkflows || []).find(
      (workflow) =>
        (workflow.department_id || null) === scopedDepartmentId &&
        workflow.requester_role === DEPARTMENT_WORKFLOW_PROFILE_ROLE,
    );
    const normalizedStages = normalizeLeaveApprovalStages(existing?.approval_stages);

    setLeaveWorkflowDrafts({
      [DEPARTMENT_WORKFLOW_PROFILE_ROLE]: {
        approval_stages:
          normalizedStages.length > 0
            ? normalizedStages
            : [...DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE.employee],
        is_active: existing?.is_active ?? true,
        notes: existing?.notes || '',
      },
    });
  }, [leaveApprovalWorkflows, selectedLeaveWorkflowDepartmentScope]);

  useEffect(() => {
    const scopedDepartmentId = scopeToDepartmentId(selectedLeaveCancellationWorkflowDepartmentScope);
    const existing = (leaveCancellationWorkflows || []).find(
      (workflow) =>
        (workflow.department_id || null) === scopedDepartmentId &&
        workflow.requester_role === DEPARTMENT_WORKFLOW_PROFILE_ROLE,
    );
    const normalizedStages = normalizeLeaveCancellationApprovalStages(existing?.approval_stages);

    setLeaveCancellationWorkflowDrafts({
      [DEPARTMENT_WORKFLOW_PROFILE_ROLE]: {
        approval_stages:
          normalizedStages.length > 0
            ? normalizedStages
            : [...DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE.employee],
        is_active: existing?.is_active ?? true,
        notes: existing?.notes || '',
      },
    });
  }, [leaveCancellationWorkflows, selectedLeaveCancellationWorkflowDepartmentScope]);

  const getLeaveWorkflowDraft = (requesterRole: AppRole): LeaveWorkflowDraft => {
    return leaveWorkflowDrafts[requesterRole] ?? {
      approval_stages: [...DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
      is_active: true,
      notes: '',
    };
  };

  const updateLeaveWorkflowDraft = (
    requesterRole: AppRole,
    updater: (draft: LeaveWorkflowDraft) => LeaveWorkflowDraft,
  ) => {
    setLeaveWorkflowDrafts((prev) => ({
      ...prev,
      [requesterRole]: updater(
        prev[requesterRole] ?? {
          approval_stages: [...DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
          is_active: true,
          notes: '',
        },
      ),
    }));
  };

  const toggleLeaveWorkflowStage = (requesterRole: AppRole, stage: LeaveApprovalStage) => {
    updateLeaveWorkflowDraft(requesterRole, (draft) => {
      const selected = new Set<LeaveApprovalStage>(draft.approval_stages);

      if (selected.has(stage)) {
        if (selected.size === 1) {
          toast.error('Workflow must contain at least one approval stage.');
          return draft;
        }
        selected.delete(stage);
      } else {
        selected.add(stage);
      }

      return {
        ...draft,
        approval_stages: normalizeLeaveApprovalStages(Array.from(selected)),
      };
    });
  };

  const resetLeaveWorkflowDraftToDefault = (requesterRole: AppRole) => {
    updateLeaveWorkflowDraft(requesterRole, (draft) => ({
      ...draft,
      approval_stages: [...DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
      is_active: true,
      notes: '',
    }));
  };

  const handleSaveLeaveWorkflow = async (requesterRole: AppRole) => {
    const draft = getLeaveWorkflowDraft(requesterRole);
    const normalizedStages = normalizeLeaveApprovalStages(draft.approval_stages);
    const departmentId = scopeToDepartmentId(selectedLeaveWorkflowDepartmentScope);

    if (normalizedStages.length === 0) {
      toast.error('Workflow must contain at least one approval stage.');
      return;
    }

    await upsertLeaveApprovalWorkflow.mutateAsync({
      departmentId,
      approvalStages: normalizedStages,
      isActive: draft.is_active,
      notes: draft.notes,
    });
  };

  const handleResetAllLeaveWorkflowDefaults = async () => {
    await resetLeaveApprovalWorkflows.mutateAsync({
      departmentId: scopeToDepartmentId(selectedLeaveWorkflowDepartmentScope),
    });
  };

  const getLeaveCancellationWorkflowDraft = (requesterRole: AppRole): LeaveWorkflowDraft => {
    return leaveCancellationWorkflowDrafts[requesterRole] ?? {
      approval_stages: [...DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
      is_active: true,
      notes: '',
    };
  };

  const updateLeaveCancellationWorkflowDraft = (
    requesterRole: AppRole,
    updater: (draft: LeaveWorkflowDraft) => LeaveWorkflowDraft,
  ) => {
    setLeaveCancellationWorkflowDrafts((prev) => ({
      ...prev,
      [requesterRole]: updater(
        prev[requesterRole] ?? {
          approval_stages: [...DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
          is_active: true,
          notes: '',
        },
      ),
    }));
  };

  const toggleLeaveCancellationWorkflowStage = (requesterRole: AppRole, stage: LeaveApprovalStage) => {
    updateLeaveCancellationWorkflowDraft(requesterRole, (draft) => {
      const selected = new Set<LeaveApprovalStage>(draft.approval_stages);

      if (selected.has(stage)) {
        if (selected.size === 1) {
          toast.error('Cancellation workflow must contain at least one approval stage.');
          return draft;
        }
        selected.delete(stage);
      } else {
        selected.add(stage);
      }

      return {
        ...draft,
        approval_stages: normalizeLeaveCancellationApprovalStages(Array.from(selected)),
      };
    });
  };

  const resetLeaveCancellationWorkflowDraftToDefault = (requesterRole: AppRole) => {
    updateLeaveCancellationWorkflowDraft(requesterRole, (draft) => ({
      ...draft,
      approval_stages: [...DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE[requesterRole]],
      is_active: true,
      notes: '',
    }));
  };

  const handleSaveLeaveCancellationWorkflow = async (requesterRole: AppRole) => {
    const draft = getLeaveCancellationWorkflowDraft(requesterRole);
    const normalizedStages = normalizeLeaveCancellationApprovalStages(draft.approval_stages);
    const departmentId = scopeToDepartmentId(selectedLeaveCancellationWorkflowDepartmentScope);

    if (normalizedStages.length === 0) {
      toast.error('Cancellation workflow must contain at least one approval stage.');
      return;
    }

    await upsertLeaveCancellationWorkflow.mutateAsync({
      departmentId,
      approvalStages: normalizedStages,
      isActive: draft.is_active,
      notes: draft.notes,
    });
  };

  const handleResetAllLeaveCancellationWorkflowDefaults = async () => {
    await resetLeaveCancellationWorkflows.mutateAsync({
      departmentId: scopeToDepartmentId(selectedLeaveCancellationWorkflowDepartmentScope),
    });
  };

  const getWorkflowRoutePreview = (stages: LeaveApprovalStage[]) =>
    normalizeLeaveApprovalStages(stages)
      .map((stage) =>
        stage === 'manager' ? 'Manager' : stage === 'general_manager' ? 'General Manager' : 'Director',
      )
      .join(' -> ');

  const selectedLeaveWorkflowDraft = getLeaveWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE);
  const selectedLeaveCancellationWorkflowDraft = getLeaveCancellationWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE);

  return (
    <>
      <DepartmentWorkflowBuilderCard
        title="Leave Approval Workflow Builder"
        description="Configure the standard approval route by department. A single department route is used for all employees in that department (the system safely adapts stages for manager/GM/director requests to avoid self-approval). Stage order is fixed (Manager, then GM, then Director). HR/Admin are view-only and are notified after final approval."
        loading={leaveApprovalWorkflowsLoading}
        onResetDefaults={handleResetAllLeaveWorkflowDefaults}
        resetDefaultsPending={resetLeaveApprovalWorkflows.isPending}
        departmentScopeSelectId="workflow-department-scope"
        departmentScope={selectedLeaveWorkflowDepartmentScope}
        onDepartmentScopeChange={setSelectedLeaveWorkflowDepartmentScope}
        globalScopeValue={GLOBAL_WORKFLOW_SCOPE}
        departments={departments}
        scopeHelpText="Department-specific profiles override the global default for matching employees."
        routeTitle="Department Leave Approval Route"
        scopeLabel={getWorkflowDepartmentScopeLabel(selectedLeaveWorkflowDepartmentScope)}
        routePreview={getWorkflowRoutePreview(selectedLeaveWorkflowDraft.approval_stages)}
        draft={selectedLeaveWorkflowDraft}
        activeSwitchId="workflow-active-selected"
        onActiveChange={(checked) =>
          updateLeaveWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE, (current) => ({ ...current, is_active: checked }))
        }
        onToggleStage={(stage) => toggleLeaveWorkflowStage(DEPARTMENT_WORKFLOW_PROFILE_ROLE, stage)}
        notesInputId="workflow-notes-selected"
        onNotesChange={(value) =>
          updateLeaveWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE, (current) => ({ ...current, notes: value }))
        }
        notesPlaceholder="Explain when this route should be used"
        onResetRoute={() => resetLeaveWorkflowDraftToDefault(DEPARTMENT_WORKFLOW_PROFILE_ROLE)}
        onSaveProfile={() => void handleSaveLeaveWorkflow(DEPARTMENT_WORKFLOW_PROFILE_ROLE)}
        savePending={upsertLeaveApprovalWorkflow.isPending}
      />

      <DepartmentWorkflowBuilderCard
        title="Leave Cancellation Workflow Builder"
        description="Configure the cancellation approval route by department. A single department route is used for all employees in that department (with safe stage adaptation for manager/GM/director requests). Stage order is fixed (Manager, then GM, then Director). HR/Admin are view-only and can monitor the cancellation status."
        loading={leaveCancellationWorkflowsLoading}
        onResetDefaults={handleResetAllLeaveCancellationWorkflowDefaults}
        resetDefaultsPending={resetLeaveCancellationWorkflows.isPending}
        departmentScopeSelectId="cancellation-workflow-department-scope"
        departmentScope={selectedLeaveCancellationWorkflowDepartmentScope}
        onDepartmentScopeChange={setSelectedLeaveCancellationWorkflowDepartmentScope}
        globalScopeValue={GLOBAL_WORKFLOW_SCOPE}
        departments={departments}
        scopeHelpText="Department-specific cancellation routes override the global default for matching employees."
        routeTitle="Department Leave Cancellation Route"
        scopeLabel={getWorkflowDepartmentScopeLabel(selectedLeaveCancellationWorkflowDepartmentScope)}
        routePreview={getWorkflowRoutePreview(selectedLeaveCancellationWorkflowDraft.approval_stages)}
        draft={selectedLeaveCancellationWorkflowDraft}
        activeSwitchId="cancellation-workflow-active-selected"
        onActiveChange={(checked) =>
          updateLeaveCancellationWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE, (current) => ({ ...current, is_active: checked }))
        }
        onToggleStage={(stage) => toggleLeaveCancellationWorkflowStage(DEPARTMENT_WORKFLOW_PROFILE_ROLE, stage)}
        notesInputId="cancellation-workflow-notes-selected"
        onNotesChange={(value) =>
          updateLeaveCancellationWorkflowDraft(DEPARTMENT_WORKFLOW_PROFILE_ROLE, (current) => ({ ...current, notes: value }))
        }
        notesPlaceholder="Explain when this cancellation route should be used"
        onResetRoute={() => resetLeaveCancellationWorkflowDraftToDefault(DEPARTMENT_WORKFLOW_PROFILE_ROLE)}
        onSaveProfile={() => void handleSaveLeaveCancellationWorkflow(DEPARTMENT_WORKFLOW_PROFILE_ROLE)}
        savePending={upsertLeaveCancellationWorkflow.isPending}
      />
    </>
  );
}
