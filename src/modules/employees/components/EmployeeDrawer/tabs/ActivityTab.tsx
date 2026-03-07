import { ActivityTimeline } from '@/components/activity/ActivityTimeline';
import type { ActivityTimelineItem } from '@/components/activity/types';

import type { EmployeeActivityItem } from '../../types';

interface ActivityTabProps {
  items: EmployeeActivityItem[];
  isLoading: boolean;
}

function mapEmployeeActivityItem(item: EmployeeActivityItem): ActivityTimelineItem {
  return {
    id: item.id,
    at: item.at,
    title: item.title,
    description: item.description,
    kind: item.type === 'profile_change' ? 'update' : 'status_change',
  };
}

export function ActivityTab({ items, isLoading }: ActivityTabProps) {
  return (
    <ActivityTimeline
      items={items.map(mapEmployeeActivityItem)}
      isLoading={isLoading}
      title="Recent Activity"
      emptyMessage="No profile or lifecycle activity has been recorded yet."
      loadingMessage="Loading activity..."
      timeDisplay="relative"
    />
  );
}
