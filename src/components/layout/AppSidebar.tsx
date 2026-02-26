import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Users, Calendar, Clock, GraduationCap, 
  BarChart3, Megaphone, LogOut, Building2, Shield, Menu, X,
  CalendarDays, FileText, Wallet, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';
import { canAccessAdminPage, canViewEmployeeDirectory } from '@/lib/permissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leave Management', href: '/leave', icon: Calendar },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Team Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Attendance', href: '/attendance', icon: Clock },
  { name: 'Payroll', href: '/payroll', icon: Wallet },
  { name: 'Training', href: '/training', icon: GraduationCap },
  { name: 'Performance', href: '/performance', icon: BarChart3 },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Announcements', href: '/announcements', icon: Megaphone },
];

const hrNavigation = [
  { name: 'Employees', href: '/employees', icon: Users },
];

const adminNavigation = [
  { name: 'HR Admin', href: '/admin', icon: Shield },
];

const roleDisplayNames: Record<string, string> = {
  admin: 'Admin',
  hr: 'HR',
  director: 'Director',
  general_manager: 'General Manager',
  manager: 'Manager',
  employee: 'Employee',
};

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, role, signOut } = useAuth();
  const location = useLocation();

  const initials = profile 
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  const handleNavClick = () => {
    onNavigate?.();
  };

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sidebar-primary to-cyan-300 shadow-[0_10px_20px_rgba(0,0,0,0.18)]">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-sidebar-primary-foreground">FLC-HRMS</h1>
          <p className="text-xs tracking-wide text-sidebar-foreground/55">Fook Loi Corp</p>
        </div>
      </div>

      <Separator className="mx-3 bg-sidebar-border/80" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                'mb-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive 
                  ? 'border-sidebar-border/70 bg-sidebar-accent/95 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' 
                  : 'text-sidebar-foreground/70 hover:border-sidebar-border/40 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </NavLink>
          );
        })}
        
        {/* HR/Admin/Manager/GM/Director Navigation - Employee Directory */}
        {canViewEmployeeDirectory(role) && (
          <>
            <Separator className="my-3 bg-sidebar-border/80" />
            {hrNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'mb-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive 
                      ? 'border-sidebar-border/70 bg-sidebar-accent/95 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]' 
                      : 'text-sidebar-foreground/70 hover:border-sidebar-border/40 hover:bg-sidebar-accent/55 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.name}
                </NavLink>
              );
            })}
          </>
        )}
        
        {/* Admin Navigation - Visible to Admin/HR/Director */}
        {canAccessAdminPage(role) && (
          <>
            <Separator className="my-3 bg-sidebar-border/80" />
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    'mb-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive 
                      ? 'border-destructive/30 bg-destructive/18 text-destructive' 
                      : 'text-destructive/75 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive'
                  )}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.name}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      <Separator className="mx-3 bg-sidebar-border/80" />

      {/* User Section */}
      <div className="space-y-3 p-3">
        <NavLink 
          to="/profile"
          onClick={handleNavClick}
          className={cn(
            'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-all duration-200',
            location.pathname === '/profile'
              ? 'border-sidebar-border/80 bg-sidebar-accent/95 text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'
              : 'border-transparent text-sidebar-foreground/70 hover:border-sidebar-border/50 hover:bg-sidebar-accent/55'
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-sidebar-primary/90 text-sidebar-primary-foreground text-xs shadow-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-sidebar-foreground/50">{role ? roleDisplayNames[role] || role : 'Employee'}</p>
          </div>
        </NavLink>
        
        <Button 
          variant="ghost" 
          className="h-10 w-full justify-start rounded-2xl border border-transparent text-sidebar-foreground/70 hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-3" />
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
        <SheetContent side="left" className="w-72 p-0 bg-sidebar/96 text-sidebar-foreground border-sidebar-border">
          <div className="flex flex-col h-full">
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
