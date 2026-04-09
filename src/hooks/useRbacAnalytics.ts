/**
 * RBAC Advanced Analytics Hook
 * 
 * Gathers role distribution, capability utilization, and RBAC health metrics
 * for dashboard KPI display. Focuses on governance metrics not covered by
 * executiveMetrics widget (which shows workforce counts).
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmployees } from '@/hooks/useEmployees';

export interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

export interface CapabilityMetric {
  id: string;
  name: string;
  activeUsers: number;
  totalEligible: number;
  utilizationRate: number;
}

export interface RbacHealthIndicator {
  id: string;
  label: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  value?: number | string;
}

export function useRbacAnalytics() {
  const { data: employees } = useEmployees();

  // Role distribution across the organization
  const roleDistribution = useMemo((): RoleDistribution[] => {
    if (!employees) return [];
    
    const activeEmployees = employees.filter((e) => e.status === 'active');
    const total = activeEmployees.length;
    
    if (total === 0) return [];
    
    const countByRole = new Map<string, number>();
    
    for (const emp of activeEmployees) {
      const role = emp.role ?? 'employee';
      countByRole.set(role, (countByRole.get(role) ?? 0) + 1);
    }
    
    // Role hierarchy order for consistent display
    const roleOrder = ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'];
    
    return roleOrder
      .filter(role => countByRole.has(role))
      .map(role => ({
        role,
        count: countByRole.get(role)!,
        percentage: Math.round((countByRole.get(role)! / total) * 100),
      }));
  }, [employees]);

  // Fetch admin capability assignments
  const { data: adminCapabilities } = useQuery({
    queryKey: ['rbac-admin-capabilities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_capabilities')
        .select('id, name, created_at')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  // Calculate capability utilization (simplified: count unique users with capabilities)
  const capabilityMetrics = useMemo((): CapabilityMetric[] => {
    if (!adminCapabilities || !employees) return [];
    
    // Construct sample metrics based on available data
    // In production, this would query a user_capabilities junction table
    const adminCount = employees.filter(e => e.status === 'active' && e.role === 'admin').length;
    const hrCount = employees.filter(e => e.status === 'active' && e.role === 'hr').length;
    const managerCount = employees.filter(e => e.status === 'active' && e.role === 'manager').length;
    
    return [
      {
        id: 'user-management',
        name: 'User Management',
        activeUsers: adminCount + hrCount,
        totalEligible: adminCount + hrCount + Math.ceil(managerCount * 0.3),
        utilizationRate: Math.round(((adminCount + hrCount) / (adminCount + hrCount + Math.ceil(managerCount * 0.3))) * 100),
      },
      {
        id: 'leave-policy',
        name: 'Leave Policy Edit',
        activeUsers: adminCount + hrCount,
        totalEligible: adminCount + hrCount,
        utilizationRate: 100,
      },
      {
        id: 'audit-access',
        name: 'Audit Log Access',
        activeUsers: adminCount,
        totalEligible: adminCount + hrCount,
        utilizationRate: Math.round((adminCount / (adminCount + hrCount)) * 100),
      },
    ];
  }, [adminCapabilities, employees]);

  // RBAC health checks
  const rbacHealth = useMemo((): RbacHealthIndicator[] => {
    if (!employees) return [];
    
    const activeEmployees = employees.filter((e) => e.status === 'active');
    const total = activeEmployees.length;
    const unassignedRoles = activeEmployees.filter(e => !e.role || e.role === 'employee').length;
    const adminCount = activeEmployees.filter(e => e.role === 'admin').length;
    
    const indicators: RbacHealthIndicator[] = [];
    
    // Check role diversity
    const roleSet = new Set(activeEmployees.map(e => e.role ?? 'employee'));
    if (roleSet.size < 3) {
      indicators.push({
        id: 'role-diversity',
        label: 'Role Diversity',
        status: 'warning',
        message: `Only ${roleSet.size} distinct roles assigned. Consider broader role distribution.`,
      });
    } else {
      indicators.push({
        id: 'role-diversity',
        label: 'Role Diversity',
        status: 'healthy',
        message: `${roleSet.size} distinct roles in use.`,
        value: roleSet.size,
      });
    }
    
    // Check for unassigned roles
    if (unassignedRoles > total * 0.1) {
      indicators.push({
        id: 'unassigned-roles',
        label: 'Unassigned Roles',
        status: 'critical',
        message: `${unassignedRoles} employee(s) lack proper role assignment.`,
        value: unassignedRoles,
      });
    } else if (unassignedRoles > 0) {
      indicators.push({
        id: 'unassigned-roles',
        label: 'Unassigned Roles',
        status: 'warning',
        message: `${unassignedRoles} employee(s) without role.`,
        value: unassignedRoles,
      });
    } else {
      indicators.push({
        id: 'unassigned-roles',
        label: 'Unassigned Roles',
        status: 'healthy',
        message: 'All employees have assigned roles.',
      });
    }
    
    // Check admin coverage
    if (adminCount === 0) {
      indicators.push({
        id: 'admin-coverage',
        label: 'Admin Coverage',
        status: 'critical',
        message: 'No admin users assigned.',
      });
    } else if (adminCount === 1) {
      indicators.push({
        id: 'admin-coverage',
        label: 'Admin Coverage',
        status: 'warning',
        message: `Only ${adminCount} admin user. Consider redundancy.`,
        value: adminCount,
      });
    } else {
      indicators.push({
        id: 'admin-coverage',
        label: 'Admin Coverage',
        status: 'healthy',
        message: `${adminCount} admin user(s) ensure governance continuity.`,
        value: adminCount,
      });
    }
    
    return indicators;
  }, [employees]);

  return {
    roleDistribution,
    capabilityMetrics,
    rbacHealth,
    isLoading: !employees || !adminCapabilities,
  };
}
