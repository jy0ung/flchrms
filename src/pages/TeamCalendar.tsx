import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useCalendarEvents, 
  useHolidays, 
  useCreateHoliday, 
  useDeleteHoliday,
  useDepartmentEvents,
  useCreateDepartmentEvent,
  useDeleteDepartmentEvent,
  CalendarEvent
} from '@/hooks/useCalendar';
import { useDepartments } from '@/hooks/useEmployees';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, PartyPopper, Users, Plane, CalendarPlus } from 'lucide-react';
import { format, addMonths, subMonths, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  canManageDepartmentEvents as canManageDepartmentEventsPermission,
  canManageHolidays as canManageHolidaysPermission,
  canViewCalendarLeaveTypeLabel,
} from '@/lib/permissions';

const ALL_DEPARTMENTS_VALUE = 'all';

const eventTypeColors: Record<string, string> = {
  leave: 'bg-info/20 text-info border-info/30',
  holiday: 'bg-success/20 text-success border-success/30',
  event: 'bg-accent/20 text-accent-foreground border-accent/30',
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  leave: <Plane className="w-3 h-3" />,
  holiday: <PartyPopper className="w-3 h-3" />,
  event: <Users className="w-3 h-3" />,
};

export default function TeamCalendar() {
  const { role } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const canManageHolidays = canManageHolidaysPermission(role);
  const canManageDepartmentEvents = canManageDepartmentEventsPermission(role);
  const canViewLeaveTypeLabel = canViewCalendarLeaveTypeLabel(role);

  const { data: calendarEvents, isLoading } = useCalendarEvents(currentMonth);
  const { data: holidays } = useHolidays();
  const { data: departmentEvents } = useDepartmentEvents();
  const { data: departments } = useDepartments();
  
  const createHoliday = useCreateHoliday();
  const deleteHoliday = useDeleteHoliday();
  const createEvent = useCreateDepartmentEvent();
  const deleteEvent = useDeleteDepartmentEvent();

  // Form state
  const [holidayForm, setHolidayForm] = useState({ name: '', date: '', description: '' });
  const [eventForm, setEventForm] = useState({ 
    title: '', 
    event_date: '', 
    end_date: '', 
    description: '', 
    department_id: ALL_DEPARTMENTS_VALUE,
    event_type: 'meeting' 
  });

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Pad the beginning of the calendar
  const startPadding = getDay(monthStart);
  const paddedDays = [...Array(startPadding).fill(null), ...calendarDays];

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return calendarEvents?.filter((event) => {
      if (event.endDate) {
        return isWithinInterval(startOfDay(date), {
          start: startOfDay(event.date),
          end: endOfDay(event.endDate),
        });
      }
      return isSameDay(event.date, date);
    }).sort((a, b) => {
      if (a.type === b.type) {
        return (a.employeeName || a.title).localeCompare(b.employeeName || b.title);
      }

      const typeOrder = { leave: 0, holiday: 1, event: 2 } as const;
      return typeOrder[a.type] - typeOrder[b.type];
    }) || [];
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return;
    await createHoliday.mutateAsync(holidayForm);
    setHolidayForm({ name: '', date: '', description: '' });
    setIsHolidayDialogOpen(false);
  };

  const handleAddEvent = async () => {
    if (!eventForm.title || !eventForm.event_date) return;
    await createEvent.mutateAsync({
      ...eventForm,
      department_id: eventForm.department_id === ALL_DEPARTMENTS_VALUE ? undefined : eventForm.department_id,
      end_date: eventForm.end_date || undefined,
    });
    setEventForm({
      title: '',
      event_date: '',
      end_date: '',
      description: '',
      department_id: ALL_DEPARTMENTS_VALUE,
      event_type: 'meeting',
    });
    setIsEventDialogOpen(false);
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const todayStart = startOfDay(new Date());
  const parseCalendarDate = (value: string) => parseISO(value);
  const upcomingHolidays = (holidays || [])
    .map((holiday) => ({ holiday, parsedDate: parseCalendarDate(holiday.date) }))
    .filter(({ parsedDate }) => !Number.isNaN(parsedDate.getTime()) && parsedDate >= todayStart)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime())
    .map(({ holiday }) => holiday)
    .slice(0, 5);

  const getEventPrimaryLabel = (event: CalendarEvent) => {
    if (event.type === 'leave') {
      return canViewLeaveTypeLabel ? event.title : (event.employeeName || 'Employee');
    }
    return event.title;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-stat border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team Calendar</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  View leave schedules, holidays, and department events
                </p>
              </div>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:items-center">
          {canManageDepartmentEvents && (
            <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-9 w-full gap-2 rounded-full lg:w-auto">
                  <CalendarPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Event</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Department Event</DialogTitle>
                  <DialogDescription>
                    Create a new event for your team or department.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Event Title</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="e.g., Team Meeting"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={eventForm.event_date}
                        onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (Optional)</Label>
                      <Input
                        type="date"
                        value={eventForm.end_date}
                        onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select
                      value={eventForm.event_type}
                      onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
                    >
                      <SelectTrigger className="rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="team_building">Team Building</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {canManageHolidays && (
                    <div className="space-y-2">
                      <Label>Department (Optional)</Label>
                      <Select
                        value={eventForm.department_id}
                        onValueChange={(value) => setEventForm({ ...eventForm, department_id: value })}
                      >
                        <SelectTrigger className="rounded-full">
                          <SelectValue placeholder="All departments" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_DEPARTMENTS_VALUE}>All Departments</SelectItem>
                          {departments?.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      placeholder="Event details..."
                      rows={3}
                      className="resize-y min-h-[96px]"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full sm:w-auto rounded-full" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                  <Button className="w-full sm:w-auto rounded-full" onClick={handleAddEvent} disabled={!eventForm.title || !eventForm.event_date || createEvent.isPending}>
                    {createEvent.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {canManageHolidays && (
            <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 w-full gap-2 rounded-full lg:w-auto">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Holiday</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add Company Holiday</DialogTitle>
                  <DialogDescription>
                    Add a new company-wide holiday to the calendar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Holiday Name</Label>
                    <Input
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      placeholder="e.g., Independence Day"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={holidayForm.date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={holidayForm.description}
                      onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                      placeholder="Additional details..."
                      rows={3}
                      className="resize-y min-h-[96px]"
                    />
                  </div>
                </div>
                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full sm:w-auto rounded-full" onClick={() => setIsHolidayDialogOpen(false)}>Cancel</Button>
                  <Button className="w-full sm:w-auto rounded-full" onClick={handleAddHoliday} disabled={!holidayForm.name || !holidayForm.date || createHoliday.isPending}>
                    {createHoliday.isPending ? 'Adding...' : 'Add Holiday'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 card-stat border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-1">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-96 w-full rounded-xl" />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[640px] border border-border/60 rounded-xl overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-muted/60">
                  {daysOfWeek.map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar cells */}
                <div className="grid grid-cols-7">
                  {paddedDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="h-24 md:h-28 border-b border-r bg-muted/20" />;
                    }
                    const dayEvents = getEventsForDate(date);
                    const isToday = isSameDay(date, new Date());
                    const isSelected = selectedDate && isSameDay(date, selectedDate);

                    return (
                      <div
                        key={format(date, 'yyyy-MM-dd')}
                        className={cn(
                          'h-24 md:h-28 border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/40',
                          isToday && 'bg-primary/5',
                          isSelected && 'ring-2 ring-primary ring-inset'
                        )}
                        onClick={() => setSelectedDate(date)}
                      >
                        <div className={cn(
                          'text-xs font-medium mb-1',
                          isToday && 'text-primary font-bold'
                        )}>
                          {format(date, 'd')}
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded-md truncate border',
                                eventTypeColors[event.type]
                              )}
                            >
                              <span className="hidden sm:inline">{event.type === 'leave' ? event.employeeName : event.title}</span>
                              <span className="sm:hidden">{eventTypeIcons[event.type]}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-info/20 border border-info/30" />
                <span>Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-success/20 border border-success/30" />
                <span>Holiday</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-accent/20 border border-accent/30" />
                <span>Event</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Details */}
          <Card className="card-stat border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events on this date
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        'p-3 rounded-xl border shadow-sm',
                        eventTypeColors[event.type]
                      )}
                    >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {eventTypeIcons[event.type]}
                            <span className="font-medium text-sm">{getEventPrimaryLabel(event)}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {event.type}
                          </Badge>
                        </div>
                      {event.description && (
                        <p className="text-xs mt-1 opacity-80">{event.description}</p>
                      )}
                      {event.type === 'leave' && canViewLeaveTypeLabel && event.employeeName && (
                        <p className="text-xs mt-1 opacity-80">
                          On leave: {event.employeeName}
                        </p>
                      )}
                      {event.endDate && !isSameDay(event.date, event.endDate) && (
                        <p className="text-xs mt-1 opacity-60">
                          Until {format(event.endDate, 'MMM d')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Holidays */}
          <Card className="card-stat border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PartyPopper className="w-4 h-4" />
                Upcoming Holidays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingHolidays.map((holiday) => (
                  <div key={holiday.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(holiday.date), 'EEEE, MMM d')}
                      </p>
                    </div>
                    {canManageHolidays && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{holiday.name}"?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteHoliday.mutate(holiday.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
                {upcomingHolidays.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming holidays
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
