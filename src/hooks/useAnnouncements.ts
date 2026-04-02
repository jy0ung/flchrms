import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedRpc } from '@/integrations/supabase/untyped-client';
import { Announcement } from '@/types/hrms';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';

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

  return useMutation({
    mutationFn: async (announcement: {
      title: string;
      content: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string;
      reason: string;
    }) => {
      const { data, error } = await untypedRpc('admin_create_announcement', {
        _title: announcement.title,
        _content: announcement.content,
        _priority: announcement.priority ?? 'normal',
        _expires_at: announcement.expires_at ?? null,
        _reason: announcement.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement published');
    },
    onError: (error: Error) => {
      toast.error('Failed to publish announcement', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (announcement: {
      id: string;
      title?: string;
      content?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      expires_at?: string | null;
      reason: string;
    }) => {
      const { data, error } = await untypedRpc('admin_update_announcement', {
        _announcement_id: announcement.id,
        _title: announcement.title ?? null,
        _content: announcement.content ?? null,
        _priority: announcement.priority ?? null,
        _expires_at: announcement.expires_at ?? null,
        _reason: announcement.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update announcement', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; reason: string }) => {
      const { data, error } = await untypedRpc('admin_delete_announcement', {
        _announcement_id: input.id,
        _reason: input.reason,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete announcement', { description: sanitizeErrorMessage(error) });
    },
  });
}
