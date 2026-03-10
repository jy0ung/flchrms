import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useUserNotifications } from '@/hooks/useNotifications';
import { SHELL_LABELS } from '@/lib/navigation-labels';
import { buildBottomNavItems } from './mobile-bottom-nav-config';

/**
 * Fixed bottom navigation bar shown only on mobile (<md).
 * Surfaces the 4 most-used routes + overflow via sidebar hamburger.
 */
export function MobileBottomNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { role } = useAuth();
  const location = useLocation();
  const { unreadCount } = useUserNotifications();
  const bottomNavItems = buildBottomNavItems(role);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center justify-around border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
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
              'relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
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
        className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        aria-label="More navigation"
      >
        <MoreHorizontal className="h-5 w-5" />
        <span>{SHELL_LABELS.more}</span>
      </button>
    </nav>
  );
}
