import { Fragment } from 'react';
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
import { AppPageContainer } from '@/components/system';
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
import { ROLE_DISPLAY_NAMES, getRouteLabel, getTopBarTitle } from '@/lib/navigation-labels';

export function TopBar() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <AppPageContainer
        spacing="none"
        maxWidth="7xl"
        framePadding="shell"
        className="flex h-16 min-w-0 items-center gap-3 md:h-16"
      >
        {/* Breadcrumbs (hidden on mobile — sidebar hamburger takes that space) */}
        <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
          <Breadcrumb>
            <BreadcrumbList>
              {pathSegments.map((segment: string, index: number) => {
                const path = '/' + pathSegments.slice(0, index + 1).join('/');
                const label = getRouteLabel(segment);
                const isLast = index === pathSegments.length - 1;

                return (
                  <Fragment key={path}>
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="text-xs font-medium text-muted-foreground">{label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={path} className="text-xs text-muted-foreground hover:text-foreground">{label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Mobile: just show page title */}
        <div className="min-w-0 flex-1 md:hidden">
          <p className="truncate text-sm font-medium">
            {getTopBarTitle(location.pathname)}
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
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
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
                  {role ? ROLE_DISPLAY_NAMES[role] || role : 'Employee'}
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
      </AppPageContainer>
    </header>
  );
}
