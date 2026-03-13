import { type ComponentType, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Shield,
  Users,
  Wallet,
  ChevronsLeft,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { useMyAdminCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { cn } from '@/lib/utils';
import { ROUTE_LABELS, SHELL_LABELS } from '@/lib/navigation-labels';
import {
  canViewEmployeeDirectory,
  hasRole,
  MANAGER_AND_ABOVE_ROLES,
  DOCUMENT_MANAGER_ROLES,
  PERFORMANCE_REVIEW_CONDUCTOR_ROLES,
} from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useShellNotifications } from '@/components/layout/ShellNotificationsProvider';

type SidebarNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  danger?: boolean;
  badge?: number;
};

const workNavigation: SidebarNavItem[] = [
  { name: ROUTE_LABELS.dashboard, href: '/dashboard', icon: LayoutDashboard },
  { name: ROUTE_LABELS.notifications, href: '/notifications', icon: Bell },
  { name: ROUTE_LABELS.leave, href: '/leave', icon: Calendar },
  { name: ROUTE_LABELS.attendance, href: '/attendance', icon: Clock },
];

const planningNavigation: SidebarNavItem[] = [
  { name: ROUTE_LABELS.calendar, href: '/calendar', icon: CalendarDays },
  { name: ROUTE_LABELS.training, href: '/training', icon: GraduationCap },
  { name: ROUTE_LABELS.performance, href: '/performance', icon: BarChart3 },
];

const recordsNavigation: SidebarNavItem[] = [
  { name: ROUTE_LABELS.payroll, href: '/payroll', icon: Wallet },
  { name: ROUTE_LABELS.documents, href: '/documents', icon: FileText },
  { name: ROUTE_LABELS.announcements, href: '/announcements', icon: Megaphone },
];

const peopleNavigation: SidebarNavItem[] = [
  { name: ROUTE_LABELS.employees, href: '/employees', icon: Users },
  { name: ROUTE_LABELS.departments, href: '/departments', icon: Building2 },
];

const adminNavigation: SidebarNavItem[] = [{ name: SHELL_LABELS.governance, href: '/admin', icon: Shield, danger: true }];

function SidebarNavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: SidebarNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive = location.pathname === item.href || (item.href.startsWith('/admin') && location.pathname.startsWith('/admin'));

  const link = (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-2.5 py-2 min-h-10 text-sm font-medium transition-all duration-150',
        collapsed && 'justify-center px-0',
        item.danger
          ? isActive
            ? 'bg-destructive/15 text-destructive'
            : 'text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive'
          : isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.name}</span>}
      {!collapsed && item.badge != null && item.badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
      {collapsed && item.badge != null && item.badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="relative">{link}</div>
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function SidebarNavGroup({
  items,
  collapsed,
  onNavigate,
  label,
}: {
  items: SidebarNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1">
      {label && !collapsed && (
        <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/80">
          {label}
        </p>
      )}
      {items.map((item) => (
        <SidebarNavItem key={item.name} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarContent({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const { role } = useAuth();
  const { branding } = useBrandingContext();
  const { capabilityMap } = useMyAdminCapabilities(role);
  const { unreadCount } = useShellNotifications();

  const workWithBadge = workNavigation.map((item) =>
    item.href === '/notifications' ? { ...item, badge: unreadCount } : item,
  );

  // Filter nav items by role-based permissions
  const scopedPlanning = planningNavigation.filter((item) => {
    if (item.href === '/calendar') return hasRole(role, MANAGER_AND_ABOVE_ROLES);
    if (item.href === '/performance') return hasRole(role, PERFORMANCE_REVIEW_CONDUCTOR_ROLES);
    return true;
  });

  const scopedRecords = recordsNavigation.filter((item) => {
    if (item.href === '/documents') return hasRole(role, DOCUMENT_MANAGER_ROLES);
    return true;
  });

  const scopedAdmin = capabilityMap.access_admin_console ? adminNavigation : [];
  const scopedPeople = peopleNavigation.filter((item) => {
    if (item.href === '/employees') return canViewEmployeeDirectory(role);
    if (item.href === '/departments') return capabilityMap.manage_departments;
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center h-14 shrink-0 border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-3 px-4')}>
        {branding.logo_url ? (
          <img src={branding.logo_url} alt={branding.company_name} className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <span className="text-[11px] font-bold text-primary-foreground">
              {branding.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-accent-foreground truncate tracking-tight">
            {branding.company_tagline || 'HRMS'}
          </span>
        )}
        {!collapsed && onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="ml-auto h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className={cn('flex-1 overflow-y-auto scrollbar-thin py-3', collapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-5">
          <SidebarNavGroup items={workWithBadge} collapsed={collapsed} onNavigate={onNavigate} label="Work" />
          <SidebarNavGroup items={scopedPeople} collapsed={collapsed} onNavigate={onNavigate} label="People" />
          <SidebarNavGroup items={scopedRecords} collapsed={collapsed} onNavigate={onNavigate} label="Records" />
          <SidebarNavGroup items={scopedPlanning} collapsed={collapsed} onNavigate={onNavigate} label="Planning" />
          {scopedAdmin.length > 0 && (
            <SidebarNavGroup items={scopedAdmin} collapsed={collapsed} onNavigate={onNavigate} label={SHELL_LABELS.governance} />
          )}
        </div>
      </nav>

      {/* Collapse toggle at bottom for collapsed state */}
      {collapsed && onToggle && (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                aria-label="Expand sidebar"
                className="w-full h-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <ChevronsLeft className="h-4 w-4 rotate-180" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileOpenChange,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);

  // Support external control from MobileBottomNav "More" button
  const isOpen = mobileOpen ?? internalOpen;
  const setIsOpen = onMobileOpenChange ?? setInternalOpen;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-60 bg-sidebar p-0 text-sidebar-foreground border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Mobile navigation menu</SheetTitle>
            <SheetDescription>
              Browse workspaces, records, and governance routes available to your current role.
            </SheetDescription>
          </SheetHeader>
          <SidebarContent collapsed={false} onNavigate={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'sticky top-0 h-screen shrink-0 border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      <SidebarContent collapsed={collapsed} onToggle={onToggle} />
    </aside>
  );
}
