import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats } from '@/types/hrms';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      // Try RPC first (single round-trip); fall back to parallel queries
      const { data, error } = await supabase.rpc('get_dashboard_stats');

      if (!error && data) {
        const stats = typeof data === 'string' ? JSON.parse(data) : data;
        return stats as DashboardStats;
      }

      // Fallback: parallel individual queries
      const today = new Date().toISOString().slice(0, 10);
      const [totalRes, presentRes, pendingRes, trainingRes, reviewRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('date', today).in('status', ['present', 'late']),
        supabase.from('leave_requests').select('*', { count: 'exact', head: true }).is('final_approved_at', null).not('status', 'in', '(rejected,cancelled)'),
        supabase.from('training_enrollments').select('*', { count: 'exact', head: true }).in('status', ['enrolled', 'in_progress']),
        supabase.from('performance_reviews').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);

      return {
        totalEmployees: totalRes.count || 0,
        presentToday: presentRes.count || 0,
        pendingLeaves: pendingRes.count || 0,
        activeTrainings: trainingRes.count || 0,
        upcomingReviews: reviewRes.count || 0,
      } as DashboardStats;
    },
  });
}
