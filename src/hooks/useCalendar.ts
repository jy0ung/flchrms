import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';
import { format, parseISO } from 'date-fns';

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
  leaveTypeName?: string;
  description?: string;
}

interface LeaveCalendarRpcRow {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  final_approved_at?: string | null;
  employee_first_name: string | null;
  employee_last_name: string | null;
  leave_type_name: string | null;
}

function parseDateOnlyLocal(value: string) {
  // Supabase DATE columns come back as YYYY-MM-DD. Parse as local date to avoid UTC shift.
  return parseISO(value);
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
      toast.error('Failed to add holiday', { description: sanitizeErrorMessage(error) });
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
      toast.error('Failed to delete holiday', { description: sanitizeErrorMessage(error) });
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
      toast.error('Failed to create event', { description: sanitizeErrorMessage(error) });
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
      toast.error('Failed to delete event', { description: sanitizeErrorMessage(error) });
    },
  });
}

export function useCalendarEvents(month: Date) {
  const { user } = useAuth();
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const monthStartDate = format(startOfMonth, 'yyyy-MM-dd');
  const monthEndDate = format(endOfMonth, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['calendar-events', month.getMonth(), month.getFullYear()],
    queryFn: async () => {
      const events: CalendarEvent[] = [];

      // Fetch approved leave requests
      const { data: leaves, error: leavesError } = await supabase.rpc('get_calendar_visible_leaves', {
        _start_date: monthStartDate,
        _end_date: monthEndDate,
      });

      if (leavesError) throw leavesError;

      leaves?.forEach((leave: LeaveCalendarRpcRow) => {
        const employeeName = `${leave.employee_first_name || ''} ${leave.employee_last_name || ''}`.trim();
        events.push({
          id: leave.id,
          title: `${employeeName || 'Employee'} - ${leave.leave_type_name || 'Leave'}`,
          date: parseDateOnlyLocal(leave.start_date),
          endDate: parseDateOnlyLocal(leave.end_date),
          type: 'leave',
          status: leave.status,
          employeeName: employeeName || 'Employee',
          leaveTypeName: leave.leave_type_name || 'Leave',
        });
      });

      // Fetch holidays
      const { data: holidays, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', monthStartDate)
        .lte('date', monthEndDate);

      if (holidaysError) throw holidaysError;

      holidays?.forEach((holiday: Holiday) => {
        events.push({
          id: holiday.id,
          title: holiday.name,
          date: parseDateOnlyLocal(holiday.date),
          type: 'holiday',
          description: holiday.description || undefined,
        });
      });

      // Fetch department events
      const { data: deptEvents, error: eventsError } = await supabase
        .from('department_events')
        .select('*')
        .gte('event_date', monthStartDate)
        .lte('event_date', monthEndDate);

      if (eventsError) throw eventsError;

      deptEvents?.forEach((event: DepartmentEvent) => {
        events.push({
          id: event.id,
          title: event.title,
          date: parseDateOnlyLocal(event.event_date),
          endDate: event.end_date ? parseDateOnlyLocal(event.end_date) : undefined,
          type: 'event',
          description: event.description || undefined,
        });
      });

      return events;
    },
    enabled: !!user,
  });
}