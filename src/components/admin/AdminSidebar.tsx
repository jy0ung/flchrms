import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { ComponentType } from 'react';
import {
  LayoutDashboard,
  Shield,
  FileText,
  Megaphone,
  History,
  Settings,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBrandingContext } from '@/contexts/BrandingContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import type { AdminCapabilityKey, AdminCapabilityMap } from '@/lib/admin-capabilities';
import { ROLE_DISPLAY_NAMES, ROUTE_LABELS, SHELL_LABELS } from '@/lib/navigation-labels';

type AdminNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  capability: AdminCapabilityKey;
};

const adminNavGroups: Array<{ label: string; items: AdminNavItem[] }> = [
  {
    label: 'Overview',
    items: [
      { name: ROUTE_LABELS.dashboard, href: '/admin/dashboard', icon: LayoutDashboard, capability: 'view_admin_dashboard' },
      { name: SHELL_LABELS.governanceHub, href: '/admin/quick-actions', icon: Zap, capability: 'view_admin_quick_actions' },
    ],
  },
  {
    label: 'Governance',
    items: [
      { name: ROUTE_LABELS.roles, href: '/admin/roles', icon: Shield, capability: 'manage_roles' },
      { name: ROUTE_LABELS['leave-policies'], href: '/admin/leave-policies', icon: FileText, capability: 'manage_leave_policies' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { name: ROUTE_LABELS.announcements, href: '/admin/announcements', icon: Megaphone, capability: 'manage_announcements' },
    ],
  },
  {
    label: 'System',
    items: [
      { name: ROUTE_LABELS['audit-log'], href: '/admin/audit-log', icon: History, capability: 'view_admin_audit_log' },
      { name: ROUTE_LABELS.settings, href: '/admin/settings', icon: Settings, capability: 'manage_admin_settings' },
    ],
  },
];

interface AdminSidebarProps {
  capabilityMap: AdminCapabilityMap;
}

export function AdminSidebar({ capabilityMap }: AdminSidebarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();
  const { branding } = useBrandingContext();

  const companyInitials = branding.company_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'HR';

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  const visibleGroups = adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => capabilityMap[item.capability]),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          {branding.logo_url ? (
            <img src={branding.logo_url} alt={branding.company_name} className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">{companyInitials}</span>
            </div>
          )}
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">{branding.company_name}</span>
              <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0">
                {SHELL_LABELS.governance}
              </Badge>
            </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups.length === 0 ? (
          <div className="px-3 py-4 text-xs text-sidebar-foreground/70">
            No admin sections are enabled for this account.
          </div>
        ) : (
          visibleGroups.map((group, groupIdx) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.name}
                        >
                          <NavLink to={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              {groupIdx < visibleGroups.length - 1 && (
                <SidebarSeparator className="mt-2" />
              )}
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-2 px-2 py-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initials}
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium truncate">
                {profile?.first_name} {profile?.last_name}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50">
                {role ? ROLE_DISPLAY_NAMES[role] || role : 'Unknown'}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Back to App</span>
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
