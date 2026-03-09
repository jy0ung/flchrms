import { ArrowUpRight, Compass, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WorkspaceTransitionNoticeProps {
  title: string;
  description: string;
  destination: string;
  actionLabel: string;
  supportingText?: string;
}

export function WorkspaceTransitionNotice({
  title,
  description,
  destination,
  actionLabel,
  supportingText,
}: WorkspaceTransitionNoticeProps) {
  return (
    <Card className="border-border/70 bg-muted/20 shadow-sm">
      <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
            <Compass className="h-3 w-3" />
            Admin route
          </Badge>
          <Badge variant="outline" className="gap-1 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em]">
            <Info className="h-3 w-3" />
            Workspace available
          </Badge>
        </div>

        <div className="space-y-1">
          <h2 className="text-sm font-semibold sm:text-base">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
          {supportingText ? (
            <p className="text-xs text-muted-foreground">{supportingText}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to={destination}>
              {actionLabel}
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
