import { format } from 'date-fns';
import { Megaphone } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Skeleton } from '@/components/ui/skeleton';
import { AppPageContainer, PageHeader, StatusBadge, SurfaceSection } from '@/components/system';

export default function Announcements() {
  usePageTitle('Announcements');
  const { data: announcements, isLoading } = useAnnouncements();
  const count = announcements?.length ?? 0;

  return (
    <AppPageContainer>
      <PageHeader
        shellDensity="compact"
        title="Announcements"
        description="Company-wide updates, reminders, and internal notices."
        chips={!isLoading ? [{ id: 'announcement-count', label: `${count} item${count === 1 ? '' : 's'}` }] : undefined}
      />

      {isLoading ? (
        <SurfaceSection title="Announcement Feed" description="Loading updates">
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="rounded-xl border border-border/60 bg-background/80 p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-5 w-2/3 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-44 rounded-md" />
                  <Skeleton className="h-20 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </SurfaceSection>
      ) : count === 0 ? (
        <SurfaceSection title="Announcement Feed" description="Published announcements will appear here.">
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/30">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-medium">No announcements yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Company updates will appear here when they are published.</p>
          </div>
        </SurfaceSection>
      ) : (
        <SurfaceSection title="Announcement Feed" description={`${count} published update${count === 1 ? '' : 's'}.`}>
          <div className="space-y-4">
            {announcements?.map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-border/60 bg-background/80 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <h2 className="text-lg font-semibold leading-tight md:text-xl">{announcement.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(announcement.published_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  <StatusBadge status={announcement.priority} className="self-start" />
                </div>
                <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="whitespace-pre-wrap leading-relaxed text-foreground">{announcement.content}</p>
                </div>
              </div>
            ))}
          </div>
        </SurfaceSection>
      )}
    </AppPageContainer>
  );
}
