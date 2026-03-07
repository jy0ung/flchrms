export type ActivityTimelineKind =
  | 'create'
  | 'update'
  | 'approval'
  | 'rejection'
  | 'status_change'
  | 'document'
  | 'custom';

export interface ActivityTimelineItem {
  id: string;
  at: string;
  title: string;
  description?: string | null;
  actorLabel?: string | null;
  kind: ActivityTimelineKind;
}
