import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationsBell } from './NotificationsBell';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  leave: 'Leave',
  notifications: 'Notifications',
  attendance: 'Attendance',
  training: 'Training',
  announcements: 'Announcements',
  profile: 'Profile',
  performance: 'Performance',
  calendar: 'Calendar',
  documents: 'Documents',
  payroll: 'Payroll',
  employees: 'Employees',
  admin: 'Admin',
};

const roleDisplayNames: Record<string, string> = {
  admin: 'Admin',
  hr: 'HR',
  director: 'Director',
  general_manager: 'General Manager',
  manager: 'Manager',
  employee: 'Employee',
};

export function TopBar() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4">
      {/* Breadcrumbs (hidden on mobile — sidebar hamburger takes that space) */}
      <div className="hidden md:flex flex-1 items-center gap-3 min-w-0">
        <Breadcrumb>
          <BreadcrumbList>
            {pathSegments.map((segment: string, index: number) => {
              const path = '/' + pathSegments.slice(0, index + 1).join('/');
              const label = routeLabels[segment] || segment;
              const isLast = index === pathSegments.length - 1;

              return (
                <BreadcrumbItem key={path}>
                  {index > 0 && <BreadcrumbSeparator />}
                  {isLast ? (
                    <BreadcrumbPage className="font-medium">{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={path}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Mobile: just show page title */}
      <div className="md:hidden flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {routeLabels[pathSegments[0]] || 'HRMS'}
        </p>
      </div>

      {/* Center: Command palette trigger */}
      <CommandPalette />

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationsBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">
                {profile?.first_name} {profile?.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {role ? roleDisplayNames[role] || role : 'Employee'}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
