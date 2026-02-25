import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

type WorkflowConfigEventRow = Database['public']['Tables']['workflow_config_events']['Row'];

type ActorProfileLite = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type WorkflowConfigEventWithActor = WorkflowConfigEventRow & {
  actor: ActorProfileLite | null;
};

export function useWorkflowConfigEvents(limitCount = 25) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workflow-config-events', user?.id, limitCount],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflow_config_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (error) throw error;

      const events = (data ?? []) as WorkflowConfigEventRow[];
      const actorIds = Array.from(
        new Set(events.map((event) => event.changed_by_user_id).filter((id): id is string => !!id)),
      );

      let actorById = new Map<string, ActorProfileLite>();

      if (actorIds.length > 0) {
        const { data: actorRows, error: actorError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', actorIds);

        if (actorError) throw actorError;

        actorById = new Map(
          ((actorRows ?? []) as ActorProfileLite[]).map((row) => [row.id, row]),
        );
      }

      return events.map((event) => ({
        ...event,
        actor: event.changed_by_user_id ? actorById.get(event.changed_by_user_id) ?? null : null,
      })) as WorkflowConfigEventWithActor[];
    },
  });
}
