import { type ComponentType, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
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
import { cn } from '@/lib/utils';
import {
  canAccessAdminPage,
  canViewEmployeeDirectory,
  hasRole,
  MANAGER_AND_ABOVE_ROLES,
  DOCUMENT_MANAGER_ROLES,
  PERFORMANCE_REVIEW_CONDUCTOR_ROLES,
} from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserNotifications } from '@/hooks/useNotifications';

type SidebarNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  danger?: boolean;
  badge?: number;
};

const mainNavigation: SidebarNavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

const operationsNavigation: SidebarNavItem[] = [
  { name: 'Leave', href: '/leave', icon: Calendar },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
];

const resourcesNavigation: SidebarNavItem[] = [
  { name: 'Payroll', href: '/payroll', icon: Wallet },
  { name: 'Documents', href: '/documents', icon: FileText },
];

const developmentNavigation: SidebarNavItem[] = [
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'Performance', href: '/performance', icon: BarChart3 },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
];

const employeeNavigation: SidebarNavItem[] = [{ name: 'Employees', href: '/employees', icon: Users }];

const adminNavigation: SidebarNavItem[] = [{ name: 'Admin', href: '/admin/dashboard', icon: Shield, danger: true }];

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
        'group flex items-center gap-3 rounded-md px-2 py-2 min-h-11 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        item.danger
          ? isActive
            ? 'bg-destructive/15 text-destructive'
            : 'text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive'
          : isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
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
}: {
  items: SidebarNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-0.5">
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
  const { unreadCount } = useUserNotifications(10);

  const mainWithBadge = mainNavigation.map((item) =>
    item.href === '/notifications' ? { ...item, badge: unreadCount } : item,
  );

  const scopedResources = canViewEmployeeDirectory(role)
    ? [...resourcesNavigation, ...employeeNavigation]
    : resourcesNavigation;

  // Filter nav items by role-based permissions
  const scopedOperations = operationsNavigation.filter((item) => {
    if (item.href === '/calendar') return hasRole(role, MANAGER_AND_ABOVE_ROLES);
    return true;
  });

  const filteredResources = scopedResources.filter((item) => {
    if (item.href === '/documents') return hasRole(role, DOCUMENT_MANAGER_ROLES);
    return true;
  });

  const scopedDevelopment = developmentNavigation.filter((item) => {
    if (item.href === '/performance') return hasRole(role, PERFORMANCE_REVIEW_CONDUCTOR_ROLES);
    return true;
  });

  const scopedAdmin = canAccessAdminPage(role) ? adminNavigation : [];

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn('flex items-center h-14 shrink-0 border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'gap-3 px-4')}>
        {branding.logo_url ? (
          <img src={branding.logo_url} alt={branding.company_name} className="h-7 w-7 rounded-md object-cover" />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">
              {branding.company_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {!collapsed && (
          <span className="text-sm font-semibold text-sidebar-accent-foreground truncate">
            {branding.company_tagline || 'HRMS'}
          </span>
        )}
        {!collapsed && onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="ml-auto h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className={cn('flex-1 overflow-y-auto scrollbar-thin py-3', collapsed ? 'px-2' : 'px-3')}>
        <div className="space-y-4">
          <SidebarNavGroup items={mainWithBadge} collapsed={collapsed} onNavigate={onNavigate} />
          <Separator className="bg-sidebar-border" />
          <SidebarNavGroup items={scopedOperations} collapsed={collapsed} onNavigate={onNavigate} />
          <Separator className="bg-sidebar-border" />
          <SidebarNavGroup items={filteredResources} collapsed={collapsed} onNavigate={onNavigate} />
          <Separator className="bg-sidebar-border" />
          <SidebarNavGroup items={scopedDevelopment} collapsed={collapsed} onNavigate={onNavigate} />
          {scopedAdmin.length > 0 && (
            <>
              <Separator className="bg-sidebar-border" />
              <SidebarNavGroup items={scopedAdmin} collapsed={collapsed} onNavigate={onNavigate} />
            </>
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