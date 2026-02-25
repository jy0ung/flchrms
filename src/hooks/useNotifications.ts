import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';

export type UserNotification = Database['public']['Tables']['user_notifications']['Row'];
export type UserNotificationPreferences =
  Database['public']['Tables']['user_notification_preferences']['Row'];
export type NotificationCategoryFilter = 'all' | 'leave' | 'admin' | 'system';
export type NotificationReadFilter = 'all' | 'unread' | 'read';
export type NotificationPreferenceCategory = 'leave' | 'admin' | 'system';

interface NotificationHistoryParams {
  page: number;
  pageSize?: number;
  category?: NotificationCategoryFilter;
  readFilter?: NotificationReadFilter;
}

const DEFAULT_NOTIFICATION_PREFERENCE_FLAGS = {
  leave_enabled: true,
  admin_enabled: true,
  system_enabled: true,
  email_leave_enabled: false,
  email_admin_enabled: false,
  email_system_enabled: false,
} as const;

function buildDefaultNotificationPreferences(userId: string): UserNotificationPreferences {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    ...DEFAULT_NOTIFICATION_PREFERENCE_FLAGS,
    created_at: now,
    updated_at: now,
  };
}

function useMarkNotificationsReadMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-history', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread-count', user?.id] }),
    ]);
  };

  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const { data, error } = await supabase.rpc('mark_user_notifications_read', {
        _notification_ids: notificationIds && notificationIds.length > 0 ? notificationIds : null,
      });

      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: invalidate,
  });
}

function useMarkNotificationsUnreadMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-history', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread-count', user?.id] }),
    ]);
  };

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const { data, error } = await supabase.rpc('mark_user_notifications_unread', {
        _notification_ids: notificationIds,
      });

      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: invalidate,
  });
}

function useDeleteNotificationsMutation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-history', user?.id] }),
      queryClient.invalidateQueries({ queryKey: ['user-notifications-unread-count', user?.id] }),
    ]);
  };

  return useMutation({
    mutationFn: async ({
      olderThanDays = 90,
      readOnly = true,
    }: {
      olderThanDays?: number;
      readOnly?: boolean;
    }) => {
      const { data, error } = await supabase.rpc('delete_user_notifications', {
        _older_than_days: olderThanDays,
        _read_only: readOnly,
      });

      if (error) throw error;
      return data ?? 0;
    },
    onSuccess: invalidate,
  });
}

export function useUserNotifications(limitCount = 15) {
  const { user } = useAuth();
  const markReadMutation = useMarkNotificationsReadMutation();
  const markUnreadMutation = useMarkNotificationsUnreadMutation();

  const notificationsQuery = useQuery({
    queryKey: ['user-notifications', user?.id, limitCount],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitCount);

      if (error) throw error;
      return (data ?? []) as UserNotification[];
    },
  });

  const unreadCountQuery = useQuery({
    queryKey: ['user-notifications-unread-count', user?.id],
    enabled: !!user,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);

      if (error) throw error;
      return count ?? 0;
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    isRefreshing: notificationsQuery.isFetching || unreadCountQuery.isFetching,
    isMarkingRead: markReadMutation.isPending,
    isMarkingUnread: markUnreadMutation.isPending,
    refetch: async () => {
      await Promise.all([notificationsQuery.refetch(), unreadCountQuery.refetch()]);
    },
    markNotificationRead: async (notificationId: string) => {
      await markReadMutation.mutateAsync([notificationId]);
    },
    markNotificationUnread: async (notificationId: string) => {
      await markUnreadMutation.mutateAsync([notificationId]);
    },
    markAllNotificationsRead: async () => {
      await markReadMutation.mutateAsync();
    },
  };
}

export function useNotificationHistory({
  page,
  pageSize = 20,
  category = 'all',
  readFilter = 'all',
}: NotificationHistoryParams) {
  const { user } = useAuth();
  const markReadMutation = useMarkNotificationsReadMutation();
  const markUnreadMutation = useMarkNotificationsUnreadMutation();

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const historyQuery = useQuery({
    queryKey: ['user-notifications-history', user?.id, safePage, pageSize, category, readFilter],
    enabled: !!user,
    queryFn: async () => {
      let query = supabase
        .from('user_notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (category !== 'all') {
        query = query.eq('category', category);
      }

      if (readFilter === 'unread') {
        query = query.is('read_at', null);
      } else if (readFilter === 'read') {
        query = query.not('read_at', 'is', null);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        notifications: (data ?? []) as UserNotification[],
        totalCount: count ?? 0,
      };
    },
    placeholderData: (previousData) => previousData,
  });

  const totalCount = historyQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    notifications: historyQuery.data?.notifications ?? [],
    totalCount,
    totalPages,
    page: safePage,
    pageSize,
    isLoading: historyQuery.isLoading,
    isFetching: historyQuery.isFetching,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
    isMarkingRead: markReadMutation.isPending,
    isMarkingUnread: markUnreadMutation.isPending,
    markNotificationRead: async (notificationId: string) => {
      await markReadMutation.mutateAsync([notificationId]);
    },
    markNotificationUnread: async (notificationId: string) => {
      await markUnreadMutation.mutateAsync([notificationId]);
    },
    markAllNotificationsRead: async () => {
      await markReadMutation.mutateAsync();
    },
  };
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ['user-notification-preferences', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      if (!user) throw new Error('Authentication required.');

      return (data ?? buildDefaultNotificationPreferences(user.id)) as UserNotificationPreferences;
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (
      patch: Partial<
        Pick<
          UserNotificationPreferences,
          | 'leave_enabled'
          | 'admin_enabled'
          | 'system_enabled'
          | 'email_leave_enabled'
          | 'email_admin_enabled'
          | 'email_system_enabled'
        >
      >,
    ) => {
      if (!user) throw new Error('Authentication required.');

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: user.id,
            ...patch,
          },
          { onConflict: 'user_id' },
        )
        .select('*')
        .single();

      if (error) throw error;
      return data as UserNotificationPreferences;
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['user-notification-preferences', user?.id], data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-notifications', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['user-notifications-history', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['user-notifications-unread-count', user?.id] }),
      ]);
    },
  });

  const updateCategoryEnabled = async (
    category: NotificationPreferenceCategory,
    enabled: boolean,
  ) => {
    const field = `${category}_enabled` as const;
    await updatePreferencesMutation.mutateAsync({ [field]: enabled });
  };

  const updateEmailCategoryEnabled = async (
    category: NotificationPreferenceCategory,
    enabled: boolean,
  ) => {
    const field = `email_${category}_enabled` as const;
    await updatePreferencesMutation.mutateAsync({ [field]: enabled });
  };

  return {
    preferences: preferencesQuery.data ?? null,
    isLoading: preferencesQuery.isLoading,
    isFetching: preferencesQuery.isFetching,
    isUpdating: updatePreferencesMutation.isPending,
    error: preferencesQuery.error,
    refetch: preferencesQuery.refetch,
    updateCategoryEnabled,
    updateEmailCategoryEnabled,
  };
}

export function useDeleteNotifications() {
  const mutation = useDeleteNotificationsMutation();

  return {
    isDeleting: mutation.isPending,
    deleteNotifications: async (options?: { olderThanDays?: number; readOnly?: boolean }) =>
      mutation.mutateAsync(options ?? {}),
  };
}
