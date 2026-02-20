import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { calculateWorkingDays } from '@/lib/payroll';
import { calculateAbsentEmployees, COMPLETED_REVIEW_STATUSES } from '@/lib/executive-stats';

export interface ExecutiveStats {
  // Headcount
  totalEmployees: number;
  activeEmployees: number;
  newHiresThisMonth: number;
  
  // Attendance
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
  avgAttendanceThisMonth: number;
  
  // Leave
  pendingLeaveRequests: number;
  approvedLeavesThisMonth: number;
  onLeaveToday: number;
  
  // Training
  activeTrainings: number;
  completedTrainingsThisMonth: number;
  trainingCompletionRate: number;
  
  // Performance
  pendingReviews: number;
  completedReviewsThisMonth: number;
  
  // Department info (for managers)
  departmentName?: string;
  departmentEmployeeCount?: number;
}

export function useExecutiveStats() {
  const { user, role, profile } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  
  const isManager = role === 'manager';
  const isAdminOrHR = role === 'admin' || role === 'hr';

  return useQuery({
    queryKey: ['executive-stats', user?.id, role, profile?.department_id],
    queryFn: async (): Promise<ExecutiveStats> => {
      let departmentFilter: string | null = null;
      let departmentName: string | undefined;
      
      // For managers, get their department
      if (isManager && profile?.department_id) {
        departmentFilter = profile.department_id;
        
        const { data: dept } = await supabase
          .from('departments')
          .select('name')
          .eq('id', departmentFilter)
          .single();
        departmentName = dept?.name;
      }

      // Build base query for profiles
      let profilesQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (departmentFilter) {
        profilesQuery = profilesQuery.eq('department_id', departmentFilter);
      }

      // Total employees
      const { count: totalEmployees } = await profilesQuery;

      // Active employees
      let activeQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (departmentFilter) {
        activeQuery = activeQuery.eq('department_id', departmentFilter);
      }
      const { count: activeEmployees } = await activeQuery;

      // New hires this month
      let newHiresQuery = supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('hire_date', monthStart)
        .lte('hire_date', monthEnd);
      if (departmentFilter) {
        newHiresQuery = newHiresQuery.eq('department_id', departmentFilter);
      }
      const { count: newHiresThisMonth } = await newHiresQuery;

      // Get employee IDs for department filter
      let employeeIds: string[] = [];
      if (departmentFilter) {
        const { data: deptEmployees } = await supabase
          .from('profiles')
          .select('id')
          .eq('department_id', departmentFilter);
        employeeIds = deptEmployees?.map(e => e.id) || [];
      }

      if (departmentFilter && employeeIds.length === 0) {
        return {
          totalEmployees: totalEmployees || 0,
          activeEmployees: activeEmployees || 0,
          newHiresThisMonth: newHiresThisMonth || 0,
          presentToday: 0,
          absentToday: activeEmployees || 0,
          attendanceRate: 0,
          avgAttendanceThisMonth: 0,
          pendingLeaveRequests: 0,
          approvedLeavesThisMonth: 0,
          onLeaveToday: 0,
          activeTrainings: 0,
          completedTrainingsThisMonth: 0,
          trainingCompletionRate: 0,
          pendingReviews: 0,
          completedReviewsThisMonth: 0,
          departmentName,
          departmentEmployeeCount: activeEmployees || 0,
        };
      }

      // Present today
      let presentQuery = supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['present', 'late']);
      if (departmentFilter && employeeIds.length > 0) {
        presentQuery = presentQuery.in('employee_id', employeeIds);
      }
      const { count: presentToday } = await presentQuery;

      // Average attendance this month
      let monthAttendanceQuery = supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('date', monthStart)
        .lte('date', today)
        .in('status', ['present', 'late']);
      if (departmentFilter && employeeIds.length > 0) {
        monthAttendanceQuery = monthAttendanceQuery.in('employee_id', employeeIds);
      }
      const { count: totalAttendanceRecords } = await monthAttendanceQuery;
      
      const workingDays = Math.max(1, calculateWorkingDays(monthStart, today));
      const expectedRecords = (activeEmployees || 1) * workingDays;
      const avgAttendanceThisMonth = Math.round(((totalAttendanceRecords || 0) / expectedRecords) * 100);

      // Pending leave requests
      let pendingLeaveQuery = supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'manager_approved', 'gm_approved', 'director_approved']);
      if (departmentFilter && employeeIds.length > 0) {
        pendingLeaveQuery = pendingLeaveQuery.in('employee_id', employeeIds);
      }
      const { count: pendingLeaveRequests } = await pendingLeaveQuery;

      // Approved leaves this month
      let approvedLeavesQuery = supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hr_approved')
        .gte('start_date', monthStart)
        .lte('start_date', monthEnd);
      if (departmentFilter && employeeIds.length > 0) {
        approvedLeavesQuery = approvedLeavesQuery.in('employee_id', employeeIds);
      }
      const { count: approvedLeavesThisMonth } = await approvedLeavesQuery;

      // On leave today
      let onLeaveTodayQuery = supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'hr_approved')
        .lte('start_date', today)
        .gte('end_date', today);
      if (departmentFilter && employeeIds.length > 0) {
        onLeaveTodayQuery = onLeaveTodayQuery.in('employee_id', employeeIds);
      }
      const { count: onLeaveToday } = await onLeaveTodayQuery;

      // Calculate absent (active employees - present - on leave)
      const absentToday = calculateAbsentEmployees(
        activeEmployees || 0,
        presentToday || 0,
        onLeaveToday || 0,
      );
      
      // Attendance rate
      const attendanceRate = activeEmployees ? Math.round(((presentToday || 0) / activeEmployees) * 100) : 0;

      // Active trainings
      let activeTrainingsQuery = supabase
        .from('training_enrollments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['enrolled', 'in_progress']);
      if (departmentFilter && employeeIds.length > 0) {
        activeTrainingsQuery = activeTrainingsQuery.in('employee_id', employeeIds);
      }
      const { count: activeTrainings } = await activeTrainingsQuery;

      // Completed trainings this month
      let completedTrainingsQuery = supabase
        .from('training_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', monthStart)
        .lte('completed_at', monthEnd);
      if (departmentFilter && employeeIds.length > 0) {
        completedTrainingsQuery = completedTrainingsQuery.in('employee_id', employeeIds);
      }
      const { count: completedTrainingsThisMonth } = await completedTrainingsQuery;

      // Training completion rate
      let totalEnrollmentsQuery = supabase
        .from('training_enrollments')
        .select('*', { count: 'exact', head: true });
      if (departmentFilter && employeeIds.length > 0) {
        totalEnrollmentsQuery = totalEnrollmentsQuery.in('employee_id', employeeIds);
      }
      const { count: totalEnrollments } = await totalEnrollmentsQuery;

      let completedEnrollmentsQuery = supabase
        .from('training_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      if (departmentFilter && employeeIds.length > 0) {
        completedEnrollmentsQuery = completedEnrollmentsQuery.in('employee_id', employeeIds);
      }
      const { count: completedEnrollments } = await completedEnrollmentsQuery;
      
      const trainingCompletionRate = totalEnrollments 
        ? Math.round(((completedEnrollments || 0) / totalEnrollments) * 100) 
        : 0;

      // Pending reviews
      let pendingReviewsQuery = supabase
        .from('performance_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');
      if (departmentFilter && employeeIds.length > 0) {
        pendingReviewsQuery = pendingReviewsQuery.in('employee_id', employeeIds);
      }
      const { count: pendingReviews } = await pendingReviewsQuery;

      // Completed reviews this month
      let completedReviewsQuery = supabase
        .from('performance_reviews')
        .select('*', { count: 'exact', head: true })
        .in('status', [...COMPLETED_REVIEW_STATUSES])
        .gte('submitted_at', monthStart)
        .lte('submitted_at', monthEnd);
      if (departmentFilter && employeeIds.length > 0) {
        completedReviewsQuery = completedReviewsQuery.in('employee_id', employeeIds);
      }
      const { count: completedReviewsThisMonth } = await completedReviewsQuery;

      return {
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        newHiresThisMonth: newHiresThisMonth || 0,
        presentToday: presentToday || 0,
        absentToday,
        attendanceRate,
        avgAttendanceThisMonth: Math.min(100, avgAttendanceThisMonth),
        pendingLeaveRequests: pendingLeaveRequests || 0,
        approvedLeavesThisMonth: approvedLeavesThisMonth || 0,
        onLeaveToday: onLeaveToday || 0,
        activeTrainings: activeTrainings || 0,
        completedTrainingsThisMonth: completedTrainingsThisMonth || 0,
        trainingCompletionRate,
        pendingReviews: pendingReviews || 0,
        completedReviewsThisMonth: completedReviewsThisMonth || 0,
        departmentName,
        departmentEmployeeCount: departmentFilter ? (activeEmployees || 0) : undefined,
      };
    },
    enabled: !!user && (isManager || isAdminOrHR),
    staleTime: 60000, // Cache for 1 minute
  });
}
