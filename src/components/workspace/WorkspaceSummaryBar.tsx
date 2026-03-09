import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';

export type WorkspaceSummaryItem = SummaryRailItem;

interface WorkspaceSummaryBarProps {
  items: WorkspaceSummaryItem[];
  className?: string;
}

export function WorkspaceSummaryBar({ items, className }: WorkspaceSummaryBarProps) {
  return <SummaryRail items={items} className={className} variant="contained" />;
}
