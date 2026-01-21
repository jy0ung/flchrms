import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useAnnouncements() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (announcement: {
      title: string;
      content: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          ...announcement,
          published_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement published');
    },
    onError: (error: Error) => {
      toast.error('Failed to publish announcement: ' + error.message);
    },
  });
}
