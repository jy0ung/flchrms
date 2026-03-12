import type { ComponentType } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActionTileProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconClassName?: string;
  iconSurfaceClassName?: string;
  badgeLabel?: string;
  onClick?: () => void;
  href?: string;
  to?: string;
  className?: string;
  size?: 'default' | 'compact';
}

export function ActionTile({
  title,
  description,
  icon: Icon,
  iconClassName,
  iconSurfaceClassName,
  badgeLabel,
  onClick,
  href,
  to,
  className,
  size = 'default',
}: ActionTileProps) {
  const tileClassName = cn(
    'group flex w-full flex-col rounded-xl border border-border bg-card text-left shadow-sm transition-all',
    'hover:border-primary/20 hover:shadow-md active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    size === 'compact' ? 'p-4' : 'p-5',
    className,
  );

  const content = (
    <>
      <div className={cn('flex items-start justify-between gap-3', size === 'compact' ? 'mb-2.5' : 'mb-3')}>
        <div
          className={cn(
            'flex items-center justify-center rounded-lg bg-muted',
            size === 'compact' ? 'h-9 w-9' : 'h-10 w-10',
            iconSurfaceClassName,
          )}
        >
          <Icon className={cn(size === 'compact' ? 'h-4.5 w-4.5 text-muted-foreground' : 'h-5 w-5 text-muted-foreground', iconClassName)} />
        </div>
        {badgeLabel ? (
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1">
        <h3 className={cn('font-semibold tracking-tight text-foreground', size === 'compact' ? 'text-[13px]' : 'text-sm')}>
          {title}
        </h3>
        <p className={cn('leading-relaxed text-muted-foreground', size === 'compact' ? 'text-[11px]' : 'text-xs')}>
          {description}
        </p>
      </div>
      <div
        className={cn(
          'flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
          size === 'compact' ? 'mt-3' : 'mt-4',
        )}
      >
        <span>Open</span>
        <ArrowUpRight className="h-3 w-3" />
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={tileClassName}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={tileClassName}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={tileClassName} onClick={onClick}>
      {content}
    </button>
  );
}
