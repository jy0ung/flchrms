import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
export interface EmployeeExtendedProfile {
  id: string;
  employee_id: string | null;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  department_id: string | null;
  job_title: string | null;
  hire_date: string | null;
  manager_id: string | null;
  status: string;
  employment_type: string | null;
  probation_end_date: string | null;
  work_location: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  bank_name: string | null;
  bank_account: string | null;
  created_at: string;
  updated_at: string;
}

export type LifecycleEventType =
  | 'hired'
  | 'promoted'
  | 'transferred'
  | 'salary_change'
  | 'role_change'
  | 'probation_completed'
  | 'contract_renewed'
  | 'warning_issued'
  | 'suspended'
  | 'reinstated'
  | 'resigned'
  | 'terminated'
  | 'retired';

export interface LifecycleEvent {
  id: string;
  employee_id: string;
  event_type: LifecycleEventType;
  title: string;
  event_date: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  performed_by: string | null;
  created_at: string;
}

export interface OnboardingChecklistItem {
  id: string;
  employee_id: string;
  category: string;
  task_name: string;
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_date: string | null;
  sort_order: number;
  created_at: string;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetch extended employee profile (includes lifecycle columns).
 * Falls back to the standard profiles table.
 */
export function useEmployeeProfile(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-profile', employeeId],
    queryFn: async (): Promise<EmployeeExtendedProfile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId!)
        .single();

      if (error) throw error;
      return data as unknown as EmployeeExtendedProfile;
    },
    enabled: !!employeeId,
  });
}

/**
 * Fetch lifecycle events for an employee, ordered newest → oldest.
 */
export function useEmployeeLifecycle(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee-lifecycle', employeeId],
    queryFn: async (): Promise<LifecycleEvent[]> => {
      const { data, error } = await supabase
        .from('employee_lifecycle_events')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as LifecycleEvent[];
    },
    enabled: !!employeeId,
  });
}

/**
 * Fetch onboarding checklist items for an employee.
 */
export function useOnboardingChecklist(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-checklist', employeeId],
    queryFn: async (): Promise<OnboardingChecklistItem[]> => {
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('category')
        .order('sort_order');

      if (error) throw error;
      return (data ?? []) as unknown as OnboardingChecklistItem[];
    },
    enabled: !!employeeId,
  });
}

/**
 * Add a lifecycle event.
 */
export function useAddLifecycleEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      employee_id: string;
      event_type: LifecycleEventType;
      event_date: string;
      title?: string;
      description?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const title = event.title || event.event_type.replace(/_/g, ' ');
      const { data, error } = await supabase
        .from('employee_lifecycle_events')
        .insert({
          employee_id: event.employee_id,
          event_type: event.event_type,
          event_date: event.event_date,
          title,
          description: event.description || null,
          metadata: (event.metadata || null) as Json | null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee-lifecycle', variables.employee_id] });
      toast.success('Lifecycle event added');
    },
    onError: () => {
      toast.error('Failed to add lifecycle event');
    },
  });
}

/**
 * Toggle an onboarding checklist item.
 */
export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, completed, employeeId }: { itemId: string; completed: boolean; employeeId: string }) => {
      const { error } = await supabase
        .from('onboarding_checklists')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (error) throw error;
      return { itemId, completed, employeeId };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', variables.employeeId] });
    },
    onError: () => {
      toast.error('Failed to update checklist item');
    },
  });
}

/**
 * Seed the default onboarding checklist for a new employee.
 */
export function useSeedOnboardingChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase.rpc('seed_onboarding_checklist', {
        p_employee_id: employeeId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-checklist', employeeId] });
      toast.success('Onboarding checklist created');
    },
    onError: () => {
      toast.error('Failed to seed onboarding checklist');
    },
  });
}

/**
 * Build org chart tree from employee list. Returns root nodes.
 */
export interface OrgNode {
  id: string;
  first_name: string;
  last_name: string;
  job_title: string | null;
  department_name: string | null;
  avatar_url: string | null;
  manager_id: string | null;
  children: OrgNode[];
}

export function buildOrgTree(
  employees: Array<{
    id: string;
    first_name: string;
    last_name: string;
    job_title: string | null;
    department?: { name: string } | null;
    avatar_url: string | null;
    manager_id: string | null;
  }>,
): OrgNode[] {
  const nodeMap = new Map<string, OrgNode>();

  // Create nodes
  for (const emp of employees) {
    nodeMap.set(emp.id, {
      id: emp.id,
      first_name: emp.first_name,
      last_name: emp.last_name,
      job_title: emp.job_title,
      department_name: emp.department?.name ?? null,
      avatar_url: emp.avatar_url,
      manager_id: emp.manager_id,
      children: [],
    });
  }

  const roots: OrgNode[] = [];

  // Build tree
  for (const node of nodeMap.values()) {
    if (node.manager_id && nodeMap.has(node.manager_id)) {
      nodeMap.get(node.manager_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
