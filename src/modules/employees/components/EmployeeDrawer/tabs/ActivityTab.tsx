import { formatDistanceToNowStrict } from 'date-fns';
import { Activity, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { EmployeeActivityItem } from '../../types';

interface ActivityTabProps {
  items: EmployeeActivityItem[];
  isLoading: boolean;
}

function formatRelativeTime(value: string) {
  try {
    return `${formatDistanceToNowStrict(new Date(value), { addSuffix: true })}`;
  } catch {
    return value;
  }
}

export function ActivityTab({ items, isLoading }: ActivityTabProps) {
  if (isLoading) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity...
        </CardContent>
      </Card>
    );
  }

  if (!items.length) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No profile or lifecycle activity has been recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="relative rounded-lg border border-border/60 bg-card px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{item.title}</p>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {item.type === 'profile_change' ? 'Profile' : 'Lifecycle'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(item.at)}</p>
            </div>
            {item.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
