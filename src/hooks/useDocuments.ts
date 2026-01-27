import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type DocumentCategory = 'contract' | 'certificate' | 'official' | 'other';

export interface Document {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function useDocuments(employeeId?: string) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['documents', employeeId, role],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          employee:profiles!documents_employee_id_fkey(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Document[];
    },
    enabled: !!user,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      employeeId,
      title,
      description,
      category,
    }: {
      file: File;
      employeeId: string;
      title: string;
      description?: string;
      category: DocumentCategory;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${employeeId}/${Date.now()}-${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('employee-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data, error } = await supabase
        .from('documents')
        .insert({
          employee_id: employeeId,
          title,
          description: description || null,
          category,
          file_url: filePath,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to upload document: ' + error.message);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fileUrl }: { id: string; fileUrl: string }) => {
      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('employee-documents')
        .remove([fileUrl]);

      if (storageError) throw storageError;

      // Delete document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });
}

export function useGetDocumentSignedUrl() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('employee-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
  });
}
