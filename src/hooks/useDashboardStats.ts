import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats } from '@/types/hrms';
import { format } from 'date-fns';

export function useDashboardStats() {
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Get total employees
      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get present today
      const { count: presentToday } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .in('status', ['present', 'late']);

      // Get pending leaves
      const { count: pendingLeaves } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'manager_approved', 'gm_approved', 'director_approved']);

      // Get active trainings
      const { count: activeTrainings } = await supabase
        .from('training_enrollments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['enrolled', 'in_progress']);

      // Get upcoming reviews
      const { count: upcomingReviews } = await supabase
        .from('performance_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

      return {
        totalEmployees: totalEmployees || 0,
        presentToday: presentToday || 0,
        pendingLeaves: pendingLeaves || 0,
        activeTrainings: activeTrainings || 0,
        upcomingReviews: upcomingReviews || 0,
      } as DashboardStats;
    },
  });
}
