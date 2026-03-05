import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, LeaveCancellationStatus, LeaveRequest } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import { createLeaveRequestSchema } from '@/lib/validations';
import {
  buildLeaveCancellationApprovalUpdate,
  normalizeLeaveCancellationApprovalStages,
} from '@/lib/leave-workflow';

type RpcErrorLike = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type RpcResult<T> = {
  data: T | null;
  error: RpcErrorLike | null;
};

type UntypedRpcClient = {
  rpc: <T = unknown>(fn: string, params?: Record<string, unknown>) => Promise<RpcResult<T>>;
};

const rpcClient = supabase as unknown as UntypedRpcClient;

function getRpcErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    return (error as { message: string }).message;
  }
  return '';
}

function getRpcErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const value = (error as { code?: unknown }).code;
    if (typeof value === 'string') return value;
  }
  return '';
}

function isMissingRpcError(error: unknown, functionName: string): boolean {
  const message = getRpcErrorMessage(error);
  const hasMissingFunctionSignature =
    /could not find the function|function .* does not exist|42883|pgrst/i.test(message) &&
    new RegExp(functionName, 'i').test(message);

  if (hasMissingFunctionSignature) return true;

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code === '42883') {
      return true;
    }
  }

  return false;
}

function getLeaveApprovalErrorDescription(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : getRpcErrorMessage(error);

  if (
    /Could not find the function\s+public\.approve_leave_request/i.test(raw) ||
    /Could not find the function\s+public\.leave_decide_request/i.test(raw) ||
    (/approve_leave_request/i.test(raw) && /function/i.test(raw)) ||
    (/leave_decide_request/i.test(raw) && /function/i.test(raw)) ||
    /PGRST\d{3}/i.test(raw)
  ) {
    return 'Leave approval service is unavailable. Apply latest Supabase migrations and refresh the app.';
  }

  if (/permission denied/i.test(raw) && /(function|approve_leave_request|leave_requests|user_roles)/i.test(raw)) {
    return 'Leave approval is blocked by database permissions. Verify execute grant on approve_leave_request and leave policies.';
  }

  return sanitizeErrorMessage(error);
}

function getLeaveCancellationErrorDescription(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : getRpcErrorMessage(error);
  const code = getRpcErrorCode(error);

  if (
    /Could not find the function\s+public\.leave_cancel_request_v2/i.test(raw) ||
    /Could not find the function\s+public\.leave_decide_cancellation_request_v2/i.test(raw) ||
    (/leave_cancel_request_v2/i.test(raw) && /function/i.test(raw)) ||
    (/leave_decide_cancellation_request_v2/i.test(raw) && /function/i.test(raw)) ||
    /PGRST\d{3}/i.test(raw)
  ) {
    return 'Leave cancellation service is unavailable. Apply latest Supabase migrations and refresh the app.';
  }

  if (/STALE_CANCELLATION_STATUS/i.test(raw)) {
    return 'Cancellation status changed while you were acting. Refresh and try again.';
  }

  if (/STAGE_MISMATCH/i.test(raw)) {
    return 'This cancellation request moved to a different approval stage. Refresh and retry.';
  }

  if (
    code === '42501' &&
    (/cancellation stage/i.test(raw) || /not authorized/i.test(raw) || /privilege/i.test(raw))
  ) {
    return 'You are not allowed to process this cancellation at the current stage.';
  }

  if (
    code === 'P0001' &&
    (
      /already resolved/i.test(raw) ||
      /not been submitted/i.test(raw) ||
      /non-final-approved/i.test(raw)
    )
  ) {
    return 'This cancellation request can no longer be processed.';
  }

  return sanitizeErrorMessage(error);
}

export function useLeaveRequests() {
  const { role, user } = useAuth();
  
  return useQuery({
    queryKey: ['leave-requests', role, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employee:profiles!leave_requests_employee_id_fkey(id, first_name, last_name, email, department_id),
          leave_type:leave_types(*)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!user,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: {
      leave_type_id: string;
      start_date: string;
      end_date: string;
      days_count: number;
      reason?: string;
      document_url?: string;
    }) => {
      // Validate input before sending to Supabase
      const validation = createLeaveRequestSchema.safeParse(request);
      if (!validation.success) {
        throw new Error(validation.error.errors[0]?.message ?? 'Invalid leave request data');
      }

      const { data: v2Data, error: v2Error } = await rpcClient.rpc<{
        request_id: string;
      }>('leave_submit_request_v2', {
        _leave_type_id: request.leave_type_id,
        _start_date: request.start_date,
        _end_date: request.end_date,
        _days_count: request.days_count,
        _reason: request.reason ?? null,
        _document_url: request.document_url ?? null,
        _idempotency_key: null,
      });

      if (!v2Error) {
        if (!v2Data?.request_id) {
          throw new Error('leave_submit_request_v2 returned an invalid response.');
        }

        const { data: insertedRequest, error: selectError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('id', v2Data.request_id)
          .single();

        if (selectError) throw selectError;
        return insertedRequest;
      }

      if (!isMissingRpcError(v2Error, 'leave_submit_request_v2')) {
        throw v2Error;
      }

      if (!Number.isInteger(request.days_count)) {
        throw new Error(
          'Half-day leave requires leave-core v2 migration. Apply latest Supabase migrations and retry.',
        );
      }

      const { data: legacyData, error: legacyError } = await supabase
        .from('leave_requests')
        .insert({
          leave_type_id: request.leave_type_id,
          start_date: request.start_date,
          end_date: request.end_date,
          days_count: request.days_count,
          reason: request.reason || null,
          document_url: request.document_url || null,
          employee_id: user!.id,
        })
        .select()
        .single();

      if (legacyError) throw legacyError;
      return legacyData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast.success('Leave request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit leave request', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      action, 
      rejectionReason,
      documentRequired,
      managerComments,
      currentStatus,
    }: { 
      requestId: string; 
      action: 'approve' | 'reject' | 'request_document'; 
      rejectionReason?: string;
      documentRequired?: boolean;
      managerComments?: string;
      currentStatus?: string; // Optimistic lock — pass current known status
    }) => {
      if (!user || !role) {
        throw new Error('Only authenticated approvers can process leave requests.');
      }

      const { data: v2Data, error: v2Error } = await rpcClient.rpc<unknown>('leave_decide_request', {
        _request_id: requestId,
        _action: action,
        _decision_reason: rejectionReason ?? null,
        _comments: managerComments ?? null,
        _expected_status: currentStatus ?? null,
      });

      if (!v2Error) {
        return v2Data;
      }

      if (!isMissingRpcError(v2Error, 'leave_decide_request')) {
        throw v2Error;
      }

      // Legacy fallback (keeps existing production flows operational).
      const { data: legacyData, error: legacyError } = await supabase.rpc('approve_leave_request', {
        _request_id: requestId,
        _action: action,
        _rejection_reason: rejectionReason ?? null,
        _manager_comments: managerComments ?? null,
        _document_required: action === 'reject' ? (documentRequired ?? false) : false,
        _expected_status: currentStatus ?? null,
      });

      if (legacyError) throw legacyError;
      return legacyData;
    },
    onSuccess: (_: unknown, variables: { action: 'approve' | 'reject' | 'request_document' }) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      if (variables.action === 'approve') {
        toast.success('Leave request approved');
      } else if (variables.action === 'reject') {
        toast.success('Leave request rejected');
      } else if (variables.action === 'request_document') {
        toast.success('Document request sent to employee');
      }
    },
    onError: (error: Error) => {
      console.error('[leave] approve_leave_request failed', error);
      toast.error('Failed to process leave request', { description: getLeaveApprovalErrorDescription(error) });
    },
  });
}

export function useAmendLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      amendmentNotes,
      documentUrl,
      reason
    }: { 
      requestId: string; 
      amendmentNotes: string;
      documentUrl?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('amend_leave_request', {
        _request_id: requestId,
        _amendment_notes: amendmentNotes,
        _document_url: documentUrl ?? null,
        _reason: reason ?? null,
      });
      
      if (error) throw error;
      if (!data) {
        throw new Error('Failed to amend leave request');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request amended and resubmitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to amend leave request', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason?: string;
    }) => {
      const { data: v2Data, error: v2Error } = await rpcClient.rpc<{
        result?: string;
      }>('leave_cancel_request_v2', {
        _request_id: requestId,
        _reason: reason || null,
        _comments: null,
      });

      if (!v2Error) {
        return (v2Data?.result || 'requested') as string;
      }

      if (!isMissingRpcError(v2Error, 'leave_cancel_request_v2')) {
        throw v2Error;
      }

      const { data: legacyData, error: legacyError } = await supabase.rpc('request_leave_cancellation', {
        _request_id: requestId,
        _reason: reason || null,
      });

      if (legacyError) throw legacyError;
      return (legacyData || 'requested') as string;
    },
    onSuccess: (result: string) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      if (result === 'cancelled') {
        toast.success('Leave request cancelled');
        return;
      }
      if (result === 'already_cancelled') {
        toast.success('Leave request is already cancelled');
        return;
      }
      toast.success('Leave cancellation request submitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel leave request', { description: getLeaveCancellationErrorDescription(error) });
    },
  });
}

export function useProcessLeaveCancellationRequest() {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      action,
      rejectionReason,
      comments,
      employeeRole,
    }: {
      requestId: string;
      action: 'approve' | 'reject';
      rejectionReason?: string;
      comments?: string;
      employeeRole?: string;
    }) => {
      if (!user || !role) {
        throw new Error('Only authenticated approvers can process cancellation requests.');
      }

      const { data: existingRequest, error: requestError } = await supabase
        .from('leave_requests')
        .select(`
          status,
          final_approved_at,
          employee_id,
          cancellation_status,
          cancellation_route_snapshot
        `)
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      if (!existingRequest.final_approved_at || existingRequest.status === 'cancelled') {
        throw new Error('This leave request is not eligible for cancellation approval.');
      }

      if (!existingRequest.cancellation_status) {
        throw new Error('No cancellation request is pending for this leave.');
      }

      const activeCancellationStatuses = ['pending', 'manager_approved', 'gm_approved', 'director_approved'];
      if (!activeCancellationStatuses.includes(existingRequest.cancellation_status)) {
        throw new Error('This cancellation request is already resolved.');
      }

      const { data: v2Data, error: v2Error } = await rpcClient.rpc<unknown>(
        'leave_decide_cancellation_request_v2',
        {
          _request_id: requestId,
          _action: action,
          _decision_reason: action === 'reject' ? (rejectionReason ?? null) : null,
          _comments: comments ?? null,
          _expected_cancellation_status: existingRequest.cancellation_status,
        },
      );

      if (!v2Error) {
        return v2Data;
      }

      if (!isMissingRpcError(v2Error, 'leave_decide_cancellation_request_v2')) {
        throw v2Error;
      }

      let requesterRole: AppRole = 'employee';

      if (employeeRole) {
        requesterRole = employeeRole as AppRole;
      } else {
        const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
          _user_id: existingRequest.employee_id,
        });

        if (roleError) throw roleError;
        if (roleData) requesterRole = roleData as AppRole;
      }

      let workflowStages = normalizeLeaveCancellationApprovalStages(existingRequest.cancellation_route_snapshot || undefined);

      if (workflowStages.length === 0) {
        const { data: employeeProfile } = await supabase
          .from('profiles')
          .select('department_id')
          .eq('id', existingRequest.employee_id)
          .maybeSingle();

        const employeeDepartmentId = employeeProfile?.department_id || null;

        const { data: workflowRow, error: workflowError } = await supabase
          .from('leave_cancellation_workflows')
          .select('approval_stages, is_active')
          .eq('requester_role', 'employee')
          .or(employeeDepartmentId ? `department_id.eq.${employeeDepartmentId},department_id.is.null` : 'department_id.is.null')
          .order('department_id', { ascending: true, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (workflowError && workflowError.code !== 'PGRST116' && workflowError.code !== '42P01') {
          throw workflowError;
        }

        if (workflowRow?.is_active !== false) {
          workflowStages = normalizeLeaveCancellationApprovalStages(workflowRow?.approval_stages || undefined);
        }
      }

      const updateData = buildLeaveCancellationApprovalUpdate({
        action,
        approverRole: role,
        approverId: user.id,
        requesterRole,
        currentCancellationStatus: existingRequest.cancellation_status as LeaveCancellationStatus,
        rejectionReason,
        comments,
        workflowStages,
      });

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)
        .eq('cancellation_status', existingRequest.cancellation_status)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_: unknown, variables: { action: 'approve' | 'reject' }) => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      if (variables.action === 'approve') {
        toast.success('Cancellation request processed');
      } else {
        toast.success('Cancellation request rejected');
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to process cancellation request', { description: getLeaveCancellationErrorDescription(error) });
    },
  });
}

export function useUploadLeaveDocument() {
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ file }: { file: File; requestId?: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      // Use user ID as folder for RLS policy compliance
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('leave-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Use signed URL instead of public URL for security
      const { data, error: signedUrlError } = await supabase.storage
        .from('leave-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (signedUrlError) throw signedUrlError;
      
      // Store the file path, not the signed URL (signed URLs expire)
      return filePath;
    },
    onError: (error: Error) => {
      toast.error('Failed to upload document', { description: sanitizeErrorMessage(error) });
    },
  });
}

// Hook to get a signed URL for viewing a document
export function useGetDocumentUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('leave-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
  });
}
