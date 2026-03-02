import { useMemo } from 'react';
import { useEmployees, useDepartments } from '@/hooks/useEmployees';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeptDistribution {
  department: string;
  count: number;
}

export interface LeaveTrendPoint {
  month: string;
  requests: number;
}

export function useAdminAnalytics() {
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();

  // Department employee distribution (client-side aggregation)
  const deptDistribution = useMemo((): DeptDistribution[] => {
    if (!employees || !departments) return [];
    const active = employees.filter((e) => e.status === 'active');
    const countByDept = new Map<string, number>();
    for (const emp of active) {
      const deptName = emp.department?.name ?? 'Unassigned';
      countByDept.set(deptName, (countByDept.get(deptName) ?? 0) + 1);
    }
    return Array.from(countByDept.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);
  }, [employees, departments]);

  // Leave trend — last 6 months of leave request counts
  const { data: leaveTrendRaw } = useQuery({
    queryKey: ['admin-leave-trend'],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('leave_requests')
        .select('created_at')
        .gte('created_at', fromDate)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 120_000,
  });

  const leaveTrend = useMemo((): LeaveTrendPoint[] => {
    if (!leaveTrendRaw) return [];
    const countByMonth = new Map<string, number>();

    // Pre-fill last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      countByMonth.set(key, 0);
    }

    for (const req of leaveTrendRaw) {
      const key = req.created_at.slice(0, 7);
      if (countByMonth.has(key)) {
        countByMonth.set(key, countByMonth.get(key)! + 1);
      }
    }

    return Array.from(countByMonth.entries()).map(([month, requests]) => {
      const d = new Date(month + '-01');
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month: label, requests };
    });
  }, [leaveTrendRaw]);

  return { deptDistribution, leaveTrend };
}
