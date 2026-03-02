import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, LeaveApprovalStage, LeaveApprovalWorkflow } from '@/types/hrms';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import {
  DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE,
  normalizeLeaveApprovalStages,
} from '@/lib/leave-workflow';

const DEPARTMENT_WORKFLOW_REQUESTER_ROLE: AppRole = 'employee';

async function findExistingLeaveApprovalWorkflowId(departmentId?: string | null) {
  let query = supabase
    .from('leave_approval_workflows')
    .select('id')
    .eq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE);

  query = departmentId ? query.eq('department_id', departmentId) : query.is('department_id', null);

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.id || null;
}

export function useLeaveApprovalWorkflows() {
  return useQuery({
    queryKey: ['leave-approval-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_approval_workflows')
        .select('*')
        .eq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE)
        .order('department_id', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...row,
        approval_stages: normalizeLeaveApprovalStages(row.approval_stages),
      })) as LeaveApprovalWorkflow[];
    },
  });
}

export function useUpsertLeaveApprovalWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      departmentId,
      approvalStages,
      notes,
      isActive = true,
    }: {
      departmentId?: string | null;
      approvalStages: LeaveApprovalStage[];
      notes?: string;
      isActive?: boolean;
    }) => {
      const normalizedStages = normalizeLeaveApprovalStages(approvalStages);
      const existingId = await findExistingLeaveApprovalWorkflowId(departmentId);

      const payload = {
        requester_role: DEPARTMENT_WORKFLOW_REQUESTER_ROLE,
        department_id: departmentId || null,
        approval_stages: normalizedStages,
        is_active: isActive,
        notes: notes?.trim() || null,
      };

      const { data, error } = existingId
        ? await supabase
            .from('leave_approval_workflows')
            .update(payload)
            .eq('id', existingId)
            .select()
            .single()
        : await supabase
            .from('leave_approval_workflows')
            .insert(payload)
            .select()
            .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approval-workflows'] });
      toast.success('Leave approval workflow updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update leave approval workflow', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useResetLeaveApprovalWorkflows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId }: { departmentId?: string | null } = {}) => {
      const existingId = await findExistingLeaveApprovalWorkflowId(departmentId);
      const payload = {
        requester_role: DEPARTMENT_WORKFLOW_REQUESTER_ROLE,
        department_id: departmentId || null,
        approval_stages: DEFAULT_LEAVE_APPROVAL_WORKFLOW_BY_REQUESTER_ROLE.employee,
        is_active: true,
        notes: null,
      };

      const scopeDelete = supabase
        .from('leave_approval_workflows')
        .delete()
        .neq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE);
      const { error: cleanupError } = departmentId
        ? await scopeDelete.eq('department_id', departmentId)
        : await scopeDelete.is('department_id', null);
      if (cleanupError) throw cleanupError;

      const { error } = existingId
        ? await supabase
            .from('leave_approval_workflows')
            .update(payload)
            .eq('id', existingId)
        : await supabase
            .from('leave_approval_workflows')
            .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approval-workflows'] });
      toast.success('Leave approval workflows reset to defaults');
    },
    onError: (error: Error) => {
      toast.error('Failed to reset leave approval workflows', { description: sanitizeErrorMessage(error) });
    },
  });
}