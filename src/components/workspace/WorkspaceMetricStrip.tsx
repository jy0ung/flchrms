import type { LucideIcon } from 'lucide-react';
import { SummaryRail, type SummaryRailItem, type SummaryRailTone } from '@/components/workspace/SummaryRail';

type WorkspaceMetricTone = SummaryRailTone;

export interface WorkspaceMetricItem {
  id: string;
  label: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  tone?: WorkspaceMetricTone;
}

interface WorkspaceMetricStripProps {
  items: WorkspaceMetricItem[];
  className?: string;
}

export function WorkspaceMetricStrip({ items, className }: WorkspaceMetricStripProps) {
  const summaryItems: SummaryRailItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    helper: item.description,
    icon: item.icon,
    tone: item.tone,
  }));

  return <SummaryRail items={summaryItems} className={className} variant="cards" />;
}
