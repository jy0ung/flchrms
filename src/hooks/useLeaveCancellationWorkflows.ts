import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, LeaveApprovalStage, LeaveCancellationWorkflow } from '@/types/hrms';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import {
  DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE,
  normalizeLeaveCancellationApprovalStages,
} from '@/lib/leave-workflow';

const DEPARTMENT_WORKFLOW_REQUESTER_ROLE: AppRole = 'employee';

async function findExistingLeaveCancellationWorkflowId(departmentId?: string | null) {
  let query = supabase
    .from('leave_cancellation_workflows')
    .select('id')
    .eq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE);

  query = departmentId ? query.eq('department_id', departmentId) : query.is('department_id', null);

  const { data, error } = await query.maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.id || null;
}

export function useLeaveCancellationWorkflows() {
  return useQuery({
    queryKey: ['leave-cancellation-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_cancellation_workflows')
        .select('*')
        .eq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE)
        .order('department_id', { ascending: true, nullsFirst: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...row,
        approval_stages: normalizeLeaveCancellationApprovalStages(row.approval_stages),
      })) as LeaveCancellationWorkflow[];
    },
  });
}

export function useUpsertLeaveCancellationWorkflow() {
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
      const normalizedStages = normalizeLeaveCancellationApprovalStages(approvalStages);
      const existingId = await findExistingLeaveCancellationWorkflowId(departmentId);

      const payload = {
        requester_role: DEPARTMENT_WORKFLOW_REQUESTER_ROLE,
        department_id: departmentId || null,
        approval_stages: normalizedStages,
        is_active: isActive,
        notes: notes?.trim() || null,
      };

      const { data, error } = existingId
        ? await supabase
            .from('leave_cancellation_workflows')
            .update(payload)
            .eq('id', existingId)
            .select()
            .single()
        : await supabase
            .from('leave_cancellation_workflows')
            .insert(payload)
            .select()
            .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-cancellation-workflows'] });
      toast.success('Leave cancellation workflow updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update leave cancellation workflow', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useResetLeaveCancellationWorkflows() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId }: { departmentId?: string | null } = {}) => {
      const existingId = await findExistingLeaveCancellationWorkflowId(departmentId);
      const payload = {
        requester_role: DEPARTMENT_WORKFLOW_REQUESTER_ROLE,
        department_id: departmentId || null,
        approval_stages: DEFAULT_LEAVE_CANCELLATION_WORKFLOW_BY_REQUESTER_ROLE.employee,
        is_active: true,
        notes: null,
      };

      const scopeDelete = supabase
        .from('leave_cancellation_workflows')
        .delete()
        .neq('requester_role', DEPARTMENT_WORKFLOW_REQUESTER_ROLE);
      const { error: cleanupError } = departmentId
        ? await scopeDelete.eq('department_id', departmentId)
        : await scopeDelete.is('department_id', null);
      if (cleanupError) throw cleanupError;

      const { error } = existingId
        ? await supabase
            .from('leave_cancellation_workflows')
            .update(payload)
            .eq('id', existingId)
        : await supabase
            .from('leave_cancellation_workflows')
            .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-cancellation-workflows'] });
      toast.success('Leave cancellation workflows reset to defaults');
    },
    onError: (error: Error) => {
      toast.error('Failed to reset leave cancellation workflows', { description: sanitizeErrorMessage(error) });
    },
  });
}