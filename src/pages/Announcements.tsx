import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

export default function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-destructive',
  };

  return (
    <div className="space-y-6">
      <Card className="card-stat overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-background to-accent/10 p-5 sm:p-6">
            <div className="absolute right-3 top-3 hidden rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur sm:inline-flex sm:items-center sm:gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              {isLoading ? 'Loading' : `${announcements?.length ?? 0} items`}
            </div>

            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <Megaphone className="h-4 w-4" />
                Company Updates
              </div>

              <div className="space-y-1">
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Megaphone className="h-5 w-5" />
                  </span>
                  Announcements
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Company-wide updates, reminders, and internal notices.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="border-border/60 shadow-sm">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-2/3 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-44 rounded-md" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-20 rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : announcements?.length === 0 ? (
        <Card className="card-stat border-border/60 shadow-sm">
          <CardContent className="py-14 text-center">
            <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">No announcements yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Company updates will appear here when they are published.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements?.map(announcement => (
            <Card key={announcement.id} className="card-stat border-border/60 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-lg leading-tight md:text-xl">{announcement.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(announcement.published_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  <Badge className={`${priorityColors[announcement.priority]} self-start rounded-full px-2.5 py-1 text-xs capitalize`}>
                    {announcement.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">{announcement.content}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
