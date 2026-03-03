/**
 * Dashboard widget configuration — constants, metadata, and role mappings.
 *
 * Extracted from Dashboard.tsx to keep the page component focused on layout
 * orchestration while these inert config objects live separately.
 */
import type { ComponentType } from 'react';
import type { AppRole } from '@/types/hrms';
import type { DashboardTier, DashboardWidgetDefinition, DashboardWidgetId, ResizeRule } from '@/lib/dashboard-layout';
import { TIER_WIDTH_RULES } from '@/lib/dashboard-layout';
import {
  Activity, BarChart3, Bell, Briefcase, Calendar, CalendarDays, CheckCircle2,
  ClipboardList, Clock, GraduationCap, ListTodo, Megaphone, ShieldAlert, Target, Users,
} from 'lucide-react';

// ── Widget metadata ──────────────────────────────────────────────

export interface DashboardWidgetMeta {
  id: DashboardWidgetId;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultTier: DashboardTier;
}

export const WIDGET_META: Record<DashboardWidgetId, DashboardWidgetMeta> = {
  attendanceToday: {
    id: 'attendanceToday',
    label: 'Today Attendance',
    description: 'Attendance status and clock activity for today.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  leaveBalance: {
    id: 'leaveBalance',
    label: 'Leave Balance',
    description: 'Leave balances and approval workload visibility.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  announcements: {
    id: 'announcements',
    label: 'Announcements',
    description: 'Latest company updates and notices.',
    defaultWidth: 12,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  trainingSummary: {
    id: 'trainingSummary',
    label: 'Training',
    description: 'Training progress and completion insights.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  performanceSummary: {
    id: 'performanceSummary',
    label: 'Performance Reviews',
    description: 'Performance review status and recent activity.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  teamSnapshot: {
    id: 'teamSnapshot',
    label: 'Team Snapshot',
    description: 'Headcount, present/absent, and on-leave counts for your scope.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  onLeaveToday: {
    id: 'onLeaveToday',
    label: 'Who Is On Leave Today',
    description: 'Current leave roster for the visible scope.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'secondary',
  },
  criticalInsights: {
    id: 'criticalInsights',
    label: 'Critical Insights',
    description: 'Risk and exception signals for operational leadership.',
    defaultWidth: 8,
    defaultHeight: 4,
    defaultTier: 'primary',
  },
  executiveMetrics: {
    id: 'executiveMetrics',
    label: 'Executive Metrics',
    description: 'High-signal workforce, leave, training, and review KPIs.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'primary',
  },
  charts: {
    id: 'charts',
    label: 'Analytics',
    description: 'Visual workforce analytics — attendance, leave, and training charts.',
    defaultWidth: 12,
    defaultHeight: 6,
    defaultTier: 'secondary',
  },
  calendarPreview: {
    id: 'calendarPreview',
    label: 'Calendar',
    description: 'Today and upcoming calendar events preview.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  recentActivity: {
    id: 'recentActivity',
    label: 'Recent Activity',
    description: 'Latest notifications and activity feed.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'supporting',
  },
  pendingActions: {
    id: 'pendingActions',
    label: 'Pending Actions',
    description: 'Aggregated pending approvals and reviews requiring attention.',
    defaultWidth: 4,
    defaultHeight: 4,
    defaultTier: 'primary',
  },
};

export const WIDGET_ICONS: Record<DashboardWidgetId, ComponentType<{ className?: string }>> = {
  attendanceToday: Clock,
  leaveBalance: Calendar,
  announcements: Megaphone,
  trainingSummary: GraduationCap,
  performanceSummary: ClipboardList,
  teamSnapshot: Users,
  onLeaveToday: CalendarDays,
  criticalInsights: ShieldAlert,
  executiveMetrics: Target,
  charts: BarChart3,
  calendarPreview: CalendarDays,
  recentActivity: Activity,
  pendingActions: ListTodo,
};

// ── Role → widget mapping ────────────────────────────────────────

export const ROLE_DEFAULT_WIDGETS: Record<AppRole, DashboardWidgetId[]> = {
  employee: ['attendanceToday', 'recentActivity', 'calendarPreview', 'announcements', 'leaveBalance', 'trainingSummary', 'performanceSummary'],
  manager: ['teamSnapshot', 'onLeaveToday', 'pendingActions', 'charts', 'announcements', 'calendarPreview', 'recentActivity', 'attendanceToday', 'trainingSummary', 'performanceSummary'],
  general_manager: ['criticalInsights', 'executiveMetrics', 'pendingActions', 'charts', 'announcements', 'teamSnapshot', 'onLeaveToday', 'calendarPreview', 'recentActivity', 'attendanceToday', 'trainingSummary', 'performanceSummary'],
  hr: ['criticalInsights', 'executiveMetrics', 'pendingActions', 'charts', 'announcements', 'teamSnapshot', 'onLeaveToday', 'calendarPreview', 'recentActivity', 'attendanceToday', 'trainingSummary', 'performanceSummary'],
  director: ['criticalInsights', 'executiveMetrics', 'pendingActions', 'charts', 'announcements', 'teamSnapshot', 'onLeaveToday', 'calendarPreview', 'recentActivity', 'attendanceToday', 'trainingSummary', 'performanceSummary'],
  admin: ['criticalInsights', 'pendingActions', 'charts', 'announcements', 'teamSnapshot', 'onLeaveToday', 'calendarPreview', 'recentActivity', 'trainingSummary'],
};

export const ROLE_DEFAULT_WIDGET_WIDTHS: Record<AppRole, Partial<Record<DashboardWidgetId, number>>> = {
  employee: { attendanceToday: 8, recentActivity: 4, calendarPreview: 4, announcements: 12, leaveBalance: 4, trainingSummary: 8, performanceSummary: 4 },
  manager: { teamSnapshot: 8, onLeaveToday: 4, pendingActions: 4, charts: 12, announcements: 12, calendarPreview: 4, recentActivity: 4, attendanceToday: 8, trainingSummary: 8, performanceSummary: 4 },
  general_manager: { criticalInsights: 8, executiveMetrics: 4, pendingActions: 4, charts: 12, announcements: 12, teamSnapshot: 8, onLeaveToday: 4, calendarPreview: 4, recentActivity: 4, attendanceToday: 8, trainingSummary: 8, performanceSummary: 4 },
  hr: { criticalInsights: 8, executiveMetrics: 4, pendingActions: 4, charts: 12, announcements: 12, teamSnapshot: 8, onLeaveToday: 4, calendarPreview: 4, recentActivity: 4, attendanceToday: 8, trainingSummary: 8, performanceSummary: 4 },
  director: { criticalInsights: 8, executiveMetrics: 4, pendingActions: 4, charts: 12, announcements: 12, teamSnapshot: 8, onLeaveToday: 4, calendarPreview: 4, recentActivity: 4, attendanceToday: 8, trainingSummary: 8, performanceSummary: 4 },
  admin: { criticalInsights: 8, pendingActions: 4, charts: 12, announcements: 12, teamSnapshot: 8, onLeaveToday: 4, calendarPreview: 4, recentActivity: 4, trainingSummary: 4 },
};

export const MAX_LEAVE_BALANCE_ROWS_IN_WIDGET = 4;

export const WIDGET_DEFINITIONS: Record<DashboardWidgetId, DashboardWidgetDefinition> = {
  attendanceToday: { id: 'attendanceToday', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 8, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  leaveBalance: { id: 'leaveBalance', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  announcements: { id: 'announcements', defaultTier: 'secondary', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 12, defaultH: 4, minW: TIER_WIDTH_RULES.secondary.minW, maxW: TIER_WIDTH_RULES.secondary.maxW },
  trainingSummary: { id: 'trainingSummary', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 8, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  performanceSummary: { id: 'performanceSummary', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  teamSnapshot: { id: 'teamSnapshot', defaultTier: 'secondary', allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 8, defaultH: 4, minW: TIER_WIDTH_RULES.secondary.minW, maxW: TIER_WIDTH_RULES.secondary.maxW },
  onLeaveToday: { id: 'onLeaveToday', defaultTier: 'secondary', allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.secondary.minW, maxW: TIER_WIDTH_RULES.secondary.maxW },
  criticalInsights: { id: 'criticalInsights', defaultTier: 'primary', allowedRoles: ['general_manager', 'hr', 'director', 'admin'], defaultW: 8, defaultH: 4, minW: TIER_WIDTH_RULES.primary.minW, maxW: TIER_WIDTH_RULES.primary.maxW },
  executiveMetrics: { id: 'executiveMetrics', defaultTier: 'primary', allowedRoles: ['general_manager', 'hr', 'director', 'admin'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.primary.minW, maxW: TIER_WIDTH_RULES.primary.maxW },
  charts: { id: 'charts', defaultTier: 'secondary', allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 12, defaultH: 6, minW: TIER_WIDTH_RULES.secondary.minW, maxW: TIER_WIDTH_RULES.secondary.maxW },
  calendarPreview: { id: 'calendarPreview', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  recentActivity: { id: 'recentActivity', defaultTier: 'supporting', allowedRoles: ['employee', 'manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.supporting.minW, maxW: TIER_WIDTH_RULES.supporting.maxW },
  pendingActions: { id: 'pendingActions', defaultTier: 'primary', allowedRoles: ['manager', 'general_manager', 'hr', 'director', 'admin'], defaultW: 4, defaultH: 4, minW: TIER_WIDTH_RULES.primary.minW, maxW: TIER_WIDTH_RULES.primary.maxW },
};

export const DASHBOARD_LAYOUT_PRESET_VERSION = 6;
export const DASHBOARD_TIERS: DashboardTier[] = ['primary', 'secondary', 'supporting'];

// ── Utility functions ────────────────────────────────────────────

export function formatRoleLabel(role: AppRole | null | undefined) {
  if (!role) return 'Employee';
  if (role === 'general_manager') return 'General Manager';
  if (role === 'hr') return 'HR';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export function getScopeLabel(role: AppRole | null | undefined, stats?: { departmentName?: string } | null) {
  if (role === 'manager') return stats?.departmentName ? `${stats.departmentName} department` : 'your department';
  if (role === 'general_manager') return 'operations scope';
  if (role === 'hr') return 'people operations scope';
  if (role === 'director') return 'organization-wide';
  if (role === 'admin') return 'organization overview';
  return 'your account';
}

export function getCriticalWidgetTitle(role: AppRole | null | undefined) {
  switch (role) {
    case 'general_manager': return 'GM Critical Watch';
    case 'hr': return 'HR Critical Watch';
    case 'director': return 'Director Critical Watch';
    case 'admin': return 'System Admin Oversight';
    default: return 'Critical Insights';
  }
}
