import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendance } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function useTodayAttendance() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['attendance', 'today', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      return data as Attendance | null;
    },
    enabled: !!user,
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
        .order('date', { ascending: false });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Clocked in successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to clock in: ' + error.message);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Clocked out successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to clock out: ' + error.message);
    },
  });
}
