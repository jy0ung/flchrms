import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type LeaveDelegationRow = Database['public']['Tables']['leave_delegations']['Row'];
type LeaveDelegationScope = LeaveDelegationRow['scope'];
type LeaveDelegationStatus = LeaveDelegationRow['status'];
type DelegatedApprovalRole = Extract<Database['public']['Enums']['app_role'], 'manager' | 'general_manager' | 'director'>;

export type LeaveDelegatedApprovalAccess = {
  manager: boolean;
  generalManager: boolean;
  director: boolean;
  hasAny: boolean;
};

function hasDelegatorValue(data: unknown): boolean {
  if (typeof data === 'string') return data.length > 0;
  if (Array.isArray(data)) {
    const first = data[0] as { leave_get_active_approval_delegator?: unknown } | undefined;
    return typeof first?.leave_get_active_approval_delegator === 'string' && first.leave_get_active_approval_delegator.length > 0;
  }
  if (data && typeof data === 'object') {
    const payload = data as { leave_get_active_approval_delegator?: unknown };
    return typeof payload.leave_get_active_approval_delegator === 'string' && payload.leave_get_active_approval_delegator.length > 0;
  }
  return false;
}

async function hasDelegatedRoleAccess(delegateUserId: string, role: DelegatedApprovalRole): Promise<boolean> {
  const { data, error } = await supabase.rpc('leave_get_active_approval_delegator', {
    _delegate_user_id: delegateUserId,
    _required_role: role,
    _as_of: new Date().toISOString(),
  });

  if (error) throw error;
  return hasDelegatorValue(data);
}

export function useLeaveDelegations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leave-delegations', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_delegations')
        .select('*')
        .order('valid_to', { ascending: false });

      if (error) throw error;
      return (data ?? []) as LeaveDelegationRow[];
    },
  });
}

export function useLeaveDelegatedApprovalAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['leave-delegated-approval-access', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async (): Promise<LeaveDelegatedApprovalAccess> => {
      const delegateUserId = user?.id;
      if (!delegateUserId) {
        return {
          manager: false,
          generalManager: false,
          director: false,
          hasAny: false,
        };
      }

      const [manager, generalManager, director] = await Promise.all([
        hasDelegatedRoleAccess(delegateUserId, 'manager'),
        hasDelegatedRoleAccess(delegateUserId, 'general_manager'),
        hasDelegatedRoleAccess(delegateUserId, 'director'),
      ]);

      return {
        manager,
        generalManager,
        director,
        hasAny: manager || generalManager || director,
      };
    },
  });
}

export function useCreateLeaveDelegation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      delegateUserId: string;
      scope?: LeaveDelegationScope;
      validFrom: string;
      validTo: string;
      reason?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) {
        throw new Error('Authentication required.');
      }

      const { data, error } = await supabase
        .from('leave_delegations')
        .insert({
          delegator_user_id: user.id,
          delegate_user_id: input.delegateUserId,
          scope: input.scope ?? 'leave_approval',
          valid_from: input.validFrom,
          valid_to: input.validTo,
          reason: input.reason ?? null,
          metadata: input.metadata ?? {},
          created_by: user.id,
          status: 'active',
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as LeaveDelegationRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-delegations'] });
      toast.success('Delegation created');
    },
    onError: (error) => {
      toast.error('Failed to create delegation', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useUpdateLeaveDelegationStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      delegationId: string;
      status: LeaveDelegationStatus;
    }) => {
      if (!user?.id) {
        throw new Error('Authentication required.');
      }

      const { data, error } = await supabase
        .from('leave_delegations')
        .update({
          status: input.status,
          metadata: {
            status_updated_by: user.id,
            status_updated_at: new Date().toISOString(),
          },
        })
        .eq('id', input.delegationId)
        .select('*')
        .single();

      if (error) throw error;
      return data as LeaveDelegationRow;
    },
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['leave-delegations'] });
      if (input.status === 'revoked') {
        toast.success('Delegation revoked');
      } else {
        toast.success('Delegation updated');
      }
    },
    onError: (error) => {
      toast.error('Failed to update delegation', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useDeleteLeaveDelegation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delegationId: string) => {
      const { error } = await supabase.from('leave_delegations').delete().eq('id', delegationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-delegations'] });
      toast.success('Delegation removed');
    },
    onError: (error) => {
      toast.error('Failed to remove delegation', { description: sanitizeErrorMessage(error) });
    },
  });
}
