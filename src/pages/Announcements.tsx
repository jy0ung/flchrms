import { format } from 'date-fns';
import { AlertTriangle, Megaphone, RadioTower } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

import { useAnnouncements } from '@/hooks/useAnnouncements';
import { AppPageContainer, PageHeader, StatusBadge, SurfaceSection } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

export default function Announcements() {
  usePageTitle('Announcements');
  const { data: announcements, isLoading } = useAnnouncements();
  const count = announcements?.length ?? 0;
  const urgentCount = announcements?.filter((announcement) => announcement.priority === 'urgent').length ?? 0;
  const latestPublishedAt = announcements?.reduce<string | null>((latest, announcement) => {
    if (!latest || new Date(announcement.published_at) > new Date(latest)) {
      return announcement.published_at;
    }
    return latest;
  }, null);
  const latestPublished = latestPublishedAt ? format(new Date(latestPublishedAt), 'MMM d, yyyy') : 'No updates';

  return (
    <AppPageContainer maxWidth="7xl">
      <PageHeader
        title="Announcements"
        description={!isLoading ? `${count} item${count === 1 ? '' : 's'} — Company-wide updates, reminders, and internal notices.` : 'Company-wide updates, reminders, and internal notices.'}
      />

      {!isLoading ? (
        <SummaryRail
          compactBreakpoint="xl"
          items={[
            {
              id: 'published',
              label: 'Published',
              value: count,
              helper: 'Company-wide updates currently visible.',
              icon: RadioTower,
            },
            {
              id: 'urgent',
              label: 'Urgent',
              value: urgentCount,
              helper: urgentCount > 0 ? 'Requires quick attention.' : 'No urgent notices.',
              icon: AlertTriangle,
              tone: urgentCount > 0 ? 'warning' : 'default',
            },
            {
              id: 'latest',
              label: 'Latest Update',
              value: latestPublished,
              helper: 'Most recently published announcement.',
              icon: Megaphone,
              tone: 'info',
            },
          ]}
        />
      ) : null}

      {isLoading ? (
        <SurfaceSection title="Announcement Feed" description="Loading updates">
          <WorkspaceStatePanel
            title="Loading announcement feed"
            description="Preparing company updates and published notices."
            icon={Megaphone}
            animateIcon
          />
        </SurfaceSection>
      ) : count === 0 ? (
        <SurfaceSection title="Announcement Feed" description="Published announcements will appear here.">
          <WorkspaceStatePanel
            title="No announcements yet"
            description="Company updates will appear here once they are published."
            icon={Megaphone}
          />
        </SurfaceSection>
      ) : (
        <SurfaceSection title="Announcement Feed" description={`${count} published update${count === 1 ? '' : 's'}.`}>
          <div className="space-y-4">
            {announcements?.map((announcement) => (
              <div key={announcement.id} className="rounded-lg border border-border bg-background p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <h2 className="text-base font-semibold leading-tight md:text-lg">{announcement.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(announcement.published_at), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  <StatusBadge status={announcement.priority} className="self-start" />
                </div>
                <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
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
