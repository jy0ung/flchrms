import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CALENDAR_VISIBLE_LEAVE_STATUSES } from '@/lib/leave-workflow';

export interface Holiday {
  id: string;
  name: string;
  date: string;
  description: string | null;
  is_recurring: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentEvent {
  id: string;
  department_id: string | null;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  event_type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  department?: {
    id: string;
    name: string;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: 'leave' | 'holiday' | 'event';
  status?: string;
  employeeName?: string;
  description?: string;
}

interface LeaveCalendarRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  employee?: {
    first_name: string;
    last_name: string;
  } | null;
  leave_type?: {
    name: string;
  } | null;
}

export function useHolidays() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      return data as Holiday[];
    },
    enabled: !!user,
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (holiday: {
      name: string;
      date: string;
      description?: string;
      is_recurring?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('holidays')
        .insert({
          ...holiday,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add holiday: ' + error.message);
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete holiday: ' + error.message);
    },
  });
}

export function useDepartmentEvents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['department-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_events')
        .select(`
          *,
          department:departments(id, name)
        `)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data as DepartmentEvent[];
    },
    enabled: !!user,
  });
}

export function useCreateDepartmentEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      event_date: string;
      end_date?: string;
      description?: string;
      department_id?: string;
      event_type?: string;
    }) => {
      const { data, error } = await supabase
        .from('department_events')
        .insert({
          ...event,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-events'] });
      toast.success('Event created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create event: ' + error.message);
    },
  });
}

export function useDeleteDepartmentEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('department_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['department-events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete event: ' + error.message);
    },
  });
}

export function useCalendarEvents(month: Date) {
  const { user } = useAuth();
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const monthStartDate = startOfMonth.toISOString().split('T')[0];
  const monthEndDate = endOfMonth.toISOString().split('T')[0];

  return useQuery({
    queryKey: ['calendar-events', month.getMonth(), month.getFullYear()],
    queryFn: async () => {
      const events: CalendarEvent[] = [];

      // Fetch approved leave requests
      const { data: leaves, error: leavesError } = await supabase
        .from('leave_requests')
        .select(`
          id, start_date, end_date, status,
          employee:profiles!leave_requests_employee_id_fkey(first_name, last_name),
          leave_type:leave_types(name)
        `)
        .in('status', CALENDAR_VISIBLE_LEAVE_STATUSES)
        .or(`and(start_date.lte.${monthEndDate},end_date.gte.${monthStartDate})`);

      if (leavesError) throw leavesError;

      leaves?.forEach((leave: LeaveCalendarRow) => {
        const employeeName = `${leave.employee?.first_name || ''} ${leave.employee?.last_name || ''}`.trim();
        events.push({
          id: leave.id,
          title: `${employeeName || 'Employee'} - ${leave.leave_type?.name || 'Leave'}`,
          date: new Date(leave.start_date),
          endDate: new Date(leave.end_date),
          type: 'leave',
          status: leave.status,
          employeeName: employeeName || 'Employee',
        });
      });

      // Fetch holidays
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', startOfMonth.toISOString().split('T')[0])
        .lte('date', endOfMonth.toISOString().split('T')[0]);

      if (holidaysError) throw holidaysError;

      holidays?.forEach((holiday: Holiday) => {
        events.push({
          id: holiday.id,
          title: holiday.name,
          date: new Date(holiday.date),
          type: 'holiday',
          description: holiday.description || undefined,
        });
      });

      // Fetch department events
      const { data: deptEvents, error: eventsError } = await supabase
        .from('department_events')
        .select('*')
        .gte('event_date', startOfMonth.toISOString().split('T')[0])
        .lte('event_date', endOfMonth.toISOString().split('T')[0]);

      if (eventsError) throw eventsError;

      deptEvents?.forEach((event: DepartmentEvent) => {
        events.push({
          id: event.id,
          title: event.title,
          date: new Date(event.event_date),
          endDate: event.end_date ? new Date(event.end_date) : undefined,
          type: 'event',
          description: event.description || undefined,
        });
      });

      return events;
    },
    enabled: !!user,
  });
}
