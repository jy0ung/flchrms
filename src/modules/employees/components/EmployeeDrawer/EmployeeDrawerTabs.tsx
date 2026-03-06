import { TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { EmployeeDrawerTab } from '../../types';

interface EmployeeDrawerTabsProps {
  value: EmployeeDrawerTab;
  canOpenDocumentsTab: boolean;
}

const TAB_LABELS: Record<EmployeeDrawerTab, string> = {
  profile: 'Profile',
  employment: 'Employment',
  leave: 'Leave',
  documents: 'Documents',
  activity: 'Activity',
};

export function EmployeeDrawerTabs({ value, canOpenDocumentsTab }: EmployeeDrawerTabsProps) {
  const visibleTabs: EmployeeDrawerTab[] = canOpenDocumentsTab
    ? ['profile', 'employment', 'leave', 'documents', 'activity']
    : ['profile', 'employment', 'leave', 'activity'];

  return (
    <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg bg-muted/60 p-1">
      {visibleTabs.map((tab) => (
        <TabsTrigger key={tab} value={tab} className="text-xs sm:text-sm" data-state={value === tab ? 'active' : 'inactive'}>
          {TAB_LABELS[tab]}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
