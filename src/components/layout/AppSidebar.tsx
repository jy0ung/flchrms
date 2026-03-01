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
  LogOut,
  Megaphone,
  Menu,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { canAccessAdminPage, canViewEmployeeDirectory } from '@/lib/permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';

type SidebarNavItem = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  danger?: boolean;
};

const mainNavigation: SidebarNavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Team Calendar', href: '/calendar', icon: CalendarDays },
];

const operationsNavigation: SidebarNavItem[] = [
  { name: 'Leave Management', href: '/leave', icon: Calendar },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'Payroll', href: '/payroll', icon: Wallet },
];

const developmentNavigation: SidebarNavItem[] = [
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'Performance', href: '/performance', icon: BarChart3 },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
];

const employeeNavigation: SidebarNavItem[] = [{ name: 'Employees', href: '/employees', icon: Users }];

const adminNavigation: SidebarNavItem[] = [{ name: 'HR Admin', href: '/admin', icon: Shield, danger: true }];

const roleDisplayNames: Record<string, string> = {
  admin: 'Admin',
  hr: 'HR',
  director: 'Director',
  general_manager: 'General Manager',
  manager: 'Manager',
  employee: 'Employee',
};

function SidebarNavSection({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: SidebarNavItem[];
  onNavigate?: () => void;
}) {
  const location = useLocation();

  if (items.length === 0) return null;

  return (
    <section className="space-y-1.5">
      <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">{label}</p>
      <div>
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'mb-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
                item.danger
                  ? isActive
                    ? 'border-destructive/30 bg-destructive/18 text-destructive'
                    : 'text-destructive/75 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive'
                  : isActive
                    ? 'border-sidebar-border/70 bg-sidebar-accent/95 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                    : 'text-sidebar-foreground/70 hover:border-sidebar-border/40 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </NavLink>
          );
        })}
      </div>
    </section>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();

  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() : 'U';

  const scopedOperations = canViewEmployeeDirectory(role)
    ? [...operationsNavigation, ...employeeNavigation]
    : operationsNavigation;
  const scopedAdmin = canAccessAdminPage(role) ? adminNavigation : [];

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-primary to-cyan-300 shadow-[0_10px_20px_rgba(0,0,0,0.18)]">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-sidebar-primary-foreground">FLC-HRMS</h1>
          <p className="text-xs tracking-wide text-sidebar-foreground/55">Fook Loi Corp</p>
        </div>
        <ThemeToggle />
      </div>

      <Separator className="mx-3 bg-sidebar-border/80" />

      <nav aria-label="Main navigation" className="flex-1 space-y-4 overflow-y-auto p-3 scrollbar-thin">
        <SidebarNavSection label="Main Menu" items={mainNavigation} onNavigate={onNavigate} />
        <SidebarNavSection label="HR Operations" items={scopedOperations} onNavigate={onNavigate} />
        <SidebarNavSection label="Development" items={developmentNavigation} onNavigate={onNavigate} />
        {scopedAdmin.length > 0 ? <SidebarNavSection label="Admin" items={scopedAdmin} onNavigate={onNavigate} /> : null}
      </nav>

      <Separator className="mx-3 bg-sidebar-border/80" />

      <div className="space-y-3 p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-all duration-200',
            location.pathname === '/profile'
              ? 'border-sidebar-border/80 bg-sidebar-accent/95 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
              : 'border-transparent text-sidebar-foreground/70 hover:border-sidebar-border/50 hover:bg-sidebar-accent/55',
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary/90 text-xs text-sidebar-primary-foreground shadow-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-sidebar-foreground/50">{role ? roleDisplayNames[role] || role : 'Employee'}</p>
          </div>
        </NavLink>

        <Button
          variant="ghost"
          className="h-10 w-full justify-start rounded-2xl border border-transparent text-sidebar-foreground/70 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-3 top-3 z-50 border-sidebar-border/70 bg-sidebar/95 text-sidebar-foreground shadow-lg backdrop-blur hover:bg-sidebar-accent md:left-4 md:top-4"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar/96 p-0 text-sidebar-foreground">
          <div className="flex h-full flex-col">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="sticky top-0 h-screen w-[17.5rem] p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-sidebar-border/70 bg-sidebar/95 text-sidebar-foreground shadow-[0_24px_48px_rgba(16,24,40,0.18)] backdrop-blur-xl">
        <SidebarContent />
      </div>
    </aside>
  );
}