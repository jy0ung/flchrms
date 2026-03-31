import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useShellNotifications } from './ShellNotificationsProvider';
import { SHELL_LABELS } from '@/lib/navigation-labels';
import { buildBottomNavItems } from './mobile-bottom-nav-config';

/**
 * Fixed bottom navigation bar shown only on mobile (<md).
 * Surfaces the 4 primary routes for the signed-in role's daily journey,
 * with secondary destinations available through the overflow sheet.
 */
export function MobileBottomNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { role } = useAuth();
  const location = useLocation();
  const { unreadCount } = useShellNotifications();
  const bottomNavItems = buildBottomNavItems(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[4.25rem] items-center gap-1 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      aria-label="Mobile navigation"
    >
      {bottomNavItems.map((item) => {
        const isActive =
          location.pathname === item.href ||
          (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

        return (
          <NavLink
            key={item.href}
            to={item.href}
            className={cn(
              'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate leading-none">{item.name}</span>
            {item.href === '/notifications' && unreadCount > 0 && (
              <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        onClick={onOpenSidebar}
        className="flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="More navigation"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span className="max-w-full truncate leading-none">{SHELL_LABELS.more}</span>
      </button>
    </nav>
  );
}
