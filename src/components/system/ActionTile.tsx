import type { ComponentType } from 'react';
import { ArrowUpRight } from 'lucide-react';

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
  className?: string;
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
  className,
}: ActionTileProps) {
  const tileClassName = cn(
    'group flex w-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all',
    'hover:border-primary/20 hover:shadow-md active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    className,
  );

  const content = (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg bg-muted', iconSurfaceClassName)}>
          <Icon className={cn('h-5 w-5 text-muted-foreground', iconClassName)} />
        </div>
        {badgeLabel ? (
          <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wide">
            {badgeLabel}
          </Badge>
        ) : null}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span>Open</span>
        <ArrowUpRight className="h-3 w-3" />
      </div>
    </>
  );

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
