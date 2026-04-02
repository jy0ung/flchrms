import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import { AppRole } from '@/types/hrms';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRoles() {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at');
      
      if (error) throw error;
      return data as UserRole[];
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole, reason }: { userId: string; newRole: AppRole; reason: string }) => {
      const { data, error } = await untypedRpc('admin_upsert_user_role', {
        _user_id: userId,
        _new_role: newRole,
        _reason: reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('User role updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useDeleteUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await untypedRpc('admin_remove_user_role', {
        _user_id: userId,
        _reason: reason,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Role assignment removed. User now falls back to Employee access.');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete role', { description: sanitizeErrorMessage(error) });
    },
  });
}
