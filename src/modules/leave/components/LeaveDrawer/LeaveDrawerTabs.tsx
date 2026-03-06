import { TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { LeaveDrawerTab } from '@/modules/leave/types';

interface LeaveDrawerTabsProps {
  showCancellationTab: boolean;
  showDocumentsTab: boolean;
}

export function LeaveDrawerTabs({
  showCancellationTab,
  showDocumentsTab,
}: LeaveDrawerTabsProps) {
  const tabs: Array<{ value: LeaveDrawerTab; label: string }> = [
    { value: 'request', label: 'Request' },
    { value: 'balance', label: 'Balance' },
    { value: 'approval', label: 'Approval' },
  ];

  if (showCancellationTab) {
    tabs.push({ value: 'cancellation', label: 'Cancellation' });
  }

  if (showDocumentsTab) {
    tabs.push({ value: 'documents', label: 'Documents' });
  }

  return (
    <TabsList
      className="grid h-auto w-full gap-1 rounded-lg p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
