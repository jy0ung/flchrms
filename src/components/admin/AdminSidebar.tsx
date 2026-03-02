import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  Shield,
  FileText,
  Megaphone,
  History,
  Settings,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
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

const adminNavGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { name: 'Quick Actions', href: '/admin/quick-actions', icon: Zap },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Employees', href: '/admin/employees', icon: Users },
      { name: 'Departments', href: '/admin/departments', icon: Building2 },
      { name: 'Roles', href: '/admin/roles', icon: Shield },
      { name: 'Leave Policies', href: '/admin/leave-policies', icon: FileText },
    ],
  },
  {
    label: 'Content',
    items: [
      { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Audit Log', href: '/admin/audit-log', icon: History },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile, role } = useAuth();

  const roleDisplayName: Record<string, string> = {
    admin: 'Admin',
    hr: 'HR',
    director: 'Director',
    general_manager: 'General Manager',
    manager: 'Manager',
    employee: 'Employee',
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground">FL</span>
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">HRMS</span>
            <Badge variant="secondary" className="w-fit text-[10px] px-1.5 py-0">
              Admin Panel
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {adminNavGroups.map((group, groupIdx) => (
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
            {groupIdx < adminNavGroups.length - 1 && (
              <SidebarSeparator className="mt-2" />
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex flex-col gap-2 px-2 py-2">
          {/* User info */}
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initials}
            </div>
            <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-medium truncate">
                {profile?.first_name} {profile?.last_name}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50">
                {role ? roleDisplayName[role] || role : 'Unknown'}
              </span>
            </div>
          </div>
          {/* Back to App */}
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
