import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest, LeaveStatus } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
        .order('created_at', { ascending: false });
      
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
      const { data, error } = await supabase
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
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      toast.success('Leave request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit leave request: ' + error.message);
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
      managerComments
    }: { 
      requestId: string; 
      action: 'approve' | 'reject' | 'request_document'; 
      rejectionReason?: string;
      documentRequired?: boolean;
      managerComments?: string;
    }) => {
      let updateData: Record<string, unknown> = {};
      
      if (action === 'reject') {
        updateData = {
          status: 'rejected' as LeaveStatus,
          rejected_by: user!.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null,
          document_required: documentRequired || false,
          manager_comments: managerComments || null,
        };
      } else if (action === 'request_document') {
        // Manager requests supporting document - keeps status as pending but marks document required
        updateData = {
          document_required: true,
          manager_comments: managerComments || 'Please provide supporting documentation.',
        };
      } else if (role === 'manager') {
        updateData = {
          status: 'manager_approved' as LeaveStatus,
          manager_approved_by: user!.id,
          manager_approved_at: new Date().toISOString(),
          manager_comments: managerComments || null,
        };
      } else if (role === 'hr' || role === 'admin') {
        updateData = {
          status: 'hr_approved' as LeaveStatus,
          hr_approved_by: user!.id,
          hr_approved_at: new Date().toISOString(),
        };
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
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
      toast.error('Failed to process leave request: ' + error.message);
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
      const updateData: Record<string, unknown> = {
        status: 'pending' as LeaveStatus,
        amendment_notes: amendmentNotes,
        amended_at: new Date().toISOString(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      };

      if (documentUrl) {
        updateData.document_url = documentUrl;
      }

      if (reason) {
        updateData.reason = reason;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request amended and resubmitted');
    },
    onError: (error: Error) => {
      toast.error('Failed to amend leave request: ' + error.message);
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' as LeaveStatus })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast.success('Leave request cancelled');
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel leave request: ' + error.message);
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
      toast.error('Failed to upload document: ' + error.message);
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
