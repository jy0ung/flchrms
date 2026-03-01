import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { calculateWorkingDays } from '@/lib/payroll';
import { calculateAbsentEmployees, COMPLETED_REVIEW_STATUSES } from '@/lib/executive-stats';
import { canQueryExecutiveStats, isManager as isManagerRole } from '@/lib/permissions';

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
  
  const isManager = isManagerRole(role);
  const isExecutiveViewer = canQueryExecutiveStats(role) && !isManager;

  return useQuery({
    queryKey: ['executive-stats', user?.id, role, profile?.department_id],
    queryFn: async (): Promise<ExecutiveStats> => {
      // Determine department scope for managers
      const departmentId = isManager && profile?.department_id ? profile.department_id : null;

      // Try RPC first (single round-trip)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_executive_stats',
        departmentId ? { _department_id: departmentId } : {},
      );

      if (!rpcError && rpcData) {
        const stats = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
        return stats as ExecutiveStats;
      }

      // ── Fallback: parallel queries ─────────────────────────────────────
      let departmentFilter: string | null = departmentId;
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

      // Helper to apply optional department filter on profiles-linked tables
      const withDeptFilter = <T extends { eq: (col: string, val: string) => T }>(q: T) =>
        departmentFilter ? q.eq('department_id', departmentFilter) : q;

      // ── Batch 1: Profile counts (independent) ──────────────────────────
      const [totalRes, activeRes, newHiresRes] = await Promise.all([
        withDeptFilter(supabase.from('profiles').select('*', { count: 'exact', head: true })),
        withDeptFilter(supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active')),
        withDeptFilter(
          supabase.from('profiles').select('*', { count: 'exact', head: true })
            .gte('hire_date', monthStart).lte('hire_date', monthEnd),
        ),
      ]);

      const totalEmployees = totalRes.count || 0;
      const activeEmployees = activeRes.count || 0;
      const newHiresThisMonth = newHiresRes.count || 0;

      // Get employee IDs for department-scoped queries on non-profile tables
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
          totalEmployees,
          activeEmployees,
          newHiresThisMonth,
          presentToday: 0,
          absentToday: activeEmployees,
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
          departmentEmployeeCount: activeEmployees,
        };
      }

      // Helper to apply optional employee ID filter on non-profile tables
      const withEmpFilter = <T extends { in: (col: string, vals: string[]) => T }>(q: T) =>
        departmentFilter && employeeIds.length > 0 ? q.in('employee_id', employeeIds) : q;

      // ── Batch 2: All remaining count queries in parallel ───────────────
      const [
        presentRes,
        monthAttendanceRes,
        pendingLeaveRes,
        approvedLeavesRes,
        onLeaveTodayRes,
        activeTrainingsRes,
        completedTrainingsRes,
        totalEnrollmentsRes,
        completedEnrollmentsRes,
        pendingReviewsRes,
        completedReviewsRes,
      ] = await Promise.all([
        // Present today
        withEmpFilter(
          supabase.from('attendance').select('*', { count: 'exact', head: true })
            .eq('date', today).in('status', ['present', 'late']),
        ),
        // Month attendance
        withEmpFilter(
          supabase.from('attendance').select('*', { count: 'exact', head: true })
            .gte('date', monthStart).lte('date', today).in('status', ['present', 'late']),
        ),
        // Pending leave requests
        withEmpFilter(
          supabase.from('leave_requests').select('*', { count: 'exact', head: true })
            .is('final_approved_at', null).not('status', 'in', '(rejected,cancelled)'),
        ),
        // Approved leaves this month
        withEmpFilter(
          supabase.from('leave_requests').select('*', { count: 'exact', head: true })
            .not('final_approved_at', 'is', null).not('status', 'in', '(cancelled,rejected)')
            .gte('start_date', monthStart).lte('start_date', monthEnd),
        ),
        // On leave today
        withEmpFilter(
          supabase.from('leave_requests').select('*', { count: 'exact', head: true })
            .not('final_approved_at', 'is', null).not('status', 'in', '(cancelled,rejected)')
            .lte('start_date', today).gte('end_date', today),
        ),
        // Active trainings
        withEmpFilter(
          supabase.from('training_enrollments').select('*', { count: 'exact', head: true })
            .in('status', ['enrolled', 'in_progress']),
        ),
        // Completed trainings this month
        withEmpFilter(
          supabase.from('training_enrollments').select('*', { count: 'exact', head: true })
            .eq('status', 'completed').gte('completed_at', monthStart).lte('completed_at', monthEnd),
        ),
        // Total enrollments
        withEmpFilter(
          supabase.from('training_enrollments').select('*', { count: 'exact', head: true }),
        ),
        // Completed enrollments
        withEmpFilter(
          supabase.from('training_enrollments').select('*', { count: 'exact', head: true })
            .eq('status', 'completed'),
        ),
        // Pending reviews
        withEmpFilter(
          supabase.from('performance_reviews').select('*', { count: 'exact', head: true })
            .eq('status', 'draft'),
        ),
        // Completed reviews this month
        withEmpFilter(
          supabase.from('performance_reviews').select('*', { count: 'exact', head: true })
            .in('status', [...COMPLETED_REVIEW_STATUSES])
            .gte('submitted_at', monthStart).lte('submitted_at', monthEnd),
        ),
      ]);

      const presentToday = presentRes.count || 0;
      const totalAttendanceRecords = monthAttendanceRes.count || 0;
      const pendingLeaveRequests = pendingLeaveRes.count || 0;
      const approvedLeavesThisMonth = approvedLeavesRes.count || 0;
      const onLeaveToday = onLeaveTodayRes.count || 0;
      const activeTrainings = activeTrainingsRes.count || 0;
      const completedTrainingsThisMonth = completedTrainingsRes.count || 0;
      const totalEnrollments = totalEnrollmentsRes.count || 0;
      const completedEnrollments = completedEnrollmentsRes.count || 0;
      const pendingReviews = pendingReviewsRes.count || 0;
      const completedReviewsThisMonth = completedReviewsRes.count || 0;

      const workingDays = Math.max(1, calculateWorkingDays(monthStart, today));
      const expectedRecords = (activeEmployees || 1) * workingDays;
      const avgAttendanceThisMonth = Math.round((totalAttendanceRecords / expectedRecords) * 100);

      const absentToday = calculateAbsentEmployees(activeEmployees, presentToday, onLeaveToday);
      const attendanceRate = activeEmployees ? Math.round((presentToday / activeEmployees) * 100) : 0;
      const trainingCompletionRate = totalEnrollments
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

      return {
        totalEmployees,
        activeEmployees,
        newHiresThisMonth,
        presentToday,
        absentToday,
        attendanceRate,
        avgAttendanceThisMonth: Math.min(100, avgAttendanceThisMonth),
        pendingLeaveRequests,
        approvedLeavesThisMonth,
        onLeaveToday,
        activeTrainings,
        completedTrainingsThisMonth,
        trainingCompletionRate,
        pendingReviews,
        completedReviewsThisMonth,
        departmentName,
        departmentEmployeeCount: departmentFilter ? activeEmployees : undefined,
      };
    },
    enabled: !!user && (isManager || isExecutiveViewer),
    staleTime: 60000, // Cache for 1 minute
  });
}