import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendance } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import { format } from 'date-fns';

export function useTodayAttendance() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['attendance', 'today', user?.id, today],
    queryFn: async () => {
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('date', currentDate)
        .maybeSingle();
      
      if (error) throw error;
      return data as Attendance | null;
    },
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
}

export function useAttendanceHistory(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['attendance', 'history', user?.id, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user!.id)
        .order('date', { ascending: false })
        .limit(500);

      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!user,
  });
}

export function useClockIn() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const clockInTime = now.toISOString();
      
      // Check if late (after 9 AM)
      const isLate = now.getHours() >= 9;
      
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          employee_id: user!.id,
          date: today,
          clock_in: clockInTime,
          status: isLate ? 'late' : 'present',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['attendance', 'today', user?.id] });
      const previous = queryClient.getQueryData<Attendance | null>(['attendance', 'today', user?.id]);
      const now = new Date();
      queryClient.setQueryData<Attendance | null>(['attendance', 'today', user?.id], {
        id: 'optimistic',
        employee_id: user!.id,
        date: format(now, 'yyyy-MM-dd'),
        clock_in: now.toISOString(),
        clock_out: null,
        status: now.getHours() >= 9 ? 'late' : 'present',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      } as Attendance);
      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['attendance', 'today', user?.id], context.previous);
      }
      toast.error('Failed to clock in', { description: sanitizeErrorMessage(error) });
    },
    onSuccess: () => {
      toast.success('Clocked in successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

export function useClockOut() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          clock_out: now.toISOString(),
        })
        .eq('employee_id', user!.id)
        .eq('date', today)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['attendance', 'today', user?.id] });
      const previous = queryClient.getQueryData<Attendance | null>(['attendance', 'today', user?.id]);
      if (previous) {
        queryClient.setQueryData<Attendance | null>(['attendance', 'today', user?.id], {
          ...previous,
          clock_out: new Date().toISOString(),
        });
      }
      return { previous };
    },
    onError: (error: Error, _, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['attendance', 'today', user?.id], context.previous);
      }
      toast.error('Failed to clock out', { description: sanitizeErrorMessage(error) });
    },
    onSuccess: () => {
      toast.success('Clocked out successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}