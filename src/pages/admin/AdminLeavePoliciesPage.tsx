import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FileText,
  GitBranch,
  History,
  Layers3,
  Mail,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDepartments } from '@/hooks/useEmployees';
import { useLeaveTypes } from '@/hooks/useLeaveTypes';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { AdminWorkspaceLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { LeaveWorkspaceLead } from '@/components/leave/LeaveWorkspaceLead';
import { ContextChip } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { LeavePolicySubTabKey } from '@/components/admin/admin-ui-constants';

const LEAVE_POLICY_WORKSPACES: Array<{
  key: LeavePolicySubTabKey;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    key: 'leave-types',
    label: 'Leave Types',
    description: 'Publish entitlement rules, notice windows, and document requirements.',
    icon: FileText,
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Review leave operations, delegations, SLA monitoring, and display controls.',
    icon: Settings2,
  },
  {
    key: 'workflow-builders',
    label: 'Workflow Builders',
    description: 'Define approval and cancellation routing by department scope.',
    icon: GitBranch,
  },
  {
    key: 'balance-adjustments',
    label: 'Balance Adjustments',
    description: 'Apply auditable manual balance corrections and review snapshots.',
    icon: SlidersHorizontal,
  },
  {
    key: 'workflow-audit',
    label: 'Workflow Audit',
    description: 'Trace workflow changes and confirm governance history.',
    icon: History,
  },
  {
    key: 'notification-queue',
    label: 'Notification Queue',
    description: 'Inspect leave-policy notification delivery and queue operations.',
    icon: Mail,
  },
  {
    key: 'analytics-simulation',
    label: 'Analytics',
    description: 'Run policy simulations, accrual scenarios, and forecast exports.',
    icon: BarChart3,
  },
];

const CORE_WORKSPACE_KEYS: LeavePolicySubTabKey[] = ['leave-types', 'operations', 'workflow-builders'];
const EXTENDED_WORKSPACE_KEYS: LeavePolicySubTabKey[] = [
  'balance-adjustments',
  'workflow-audit',
  'notification-queue',
  'analytics-simulation',
];

function isLeavePolicyWorkspaceKey(value: string | null): value is LeavePolicySubTabKey {
  return LEAVE_POLICY_WORKSPACES.some((workspace) => workspace.key === value);
}

function isCoreWorkspace(value: LeavePolicySubTabKey) {
  return CORE_WORKSPACE_KEYS.includes(value);
}

function WorkspaceNavTrigger({
  value,
  label,
  description,
  icon: Icon,
  compact = false,
}: {
  value: LeavePolicySubTabKey;
  label: string;
  description: string;
  icon: typeof FileText;
  compact?: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className={
        compact
          ? 'flex h-10 w-full items-center justify-start rounded-full border border-border/70 bg-muted/25 px-4 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-background data-[state=active]:shadow-sm'
          : 'flex h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-left text-sm leading-5 data-[state=active]:border-primary/35 data-[state=active]:bg-background data-[state=active]:shadow-sm'
      }
    >
      <div className="rounded-xl bg-muted/70 p-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-foreground">{label}</p>
        {!compact ? (
          <p className="text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
    </TabsTrigger>
  );
}

export default function AdminLeavePoliciesPage() {
  usePageTitle('Admin · Leave Policies');
  const isMobile = useIsMobile();
  const { role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: departments } = useDepartments();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();
  const [activeTab, setActiveTab] = useState<LeavePolicySubTabKey>(() => {
    const requestedWorkspace = searchParams.get('workspace');
    return isLeavePolicyWorkspaceKey(requestedWorkspace) ? requestedWorkspace : 'leave-types';
  });

  const {
    editLeaveTypeDialogOpen, setEditLeaveTypeDialogOpen,
    createLeaveTypeDialogOpen, setCreateLeaveTypeDialogOpen,
    deleteLeaveTypeDialogOpen, setDeleteLeaveTypeDialogOpen,
    selectedLeaveType, leaveTypeForm, setLeaveTypeForm,
    handleEditLeaveType, handleCreateLeaveType,
    handleSaveNewLeaveType, handleSaveLeaveType, handleDeleteLeaveType,
    openDeleteLeaveTypeDialog,
    updateLeaveTypePending, createLeaveTypePending, deleteLeaveTypePending,
  } = useAdminLeaveTypeManagement();

  const activeWorkspace =
    LEAVE_POLICY_WORKSPACES.find((workspace) => workspace.key === activeTab) ??
    LEAVE_POLICY_WORKSPACES[0];
  const ActiveWorkspaceIcon = activeWorkspace.icon;
  const coreWorkspaces = LEAVE_POLICY_WORKSPACES.filter((workspace) => CORE_WORKSPACE_KEYS.includes(workspace.key));
  const extendedWorkspaces = LEAVE_POLICY_WORKSPACES.filter((workspace) => EXTENDED_WORKSPACE_KEYS.includes(workspace.key));

  const summaryItems = useMemo<SummaryRailItem[]>(
    () => [
      {
        id: 'leave-types',
        label: 'Published leave types',
        value: leaveTypes?.length ?? 0,
        helper: 'Policy records currently available to employees.',
        icon: FileText,
        tone: 'info',
      },
      {
        id: 'departments',
        label: 'Department scopes',
        value: departments?.length ?? 0,
        helper: 'Department workspaces available for routing and oversight.',
        icon: Building2,
      },
    ],
    [departments, leaveTypes],
  );

  useEffect(() => {
    const requestedWorkspace = searchParams.get('workspace');
    if (isLeavePolicyWorkspaceKey(requestedWorkspace) && requestedWorkspace !== activeTab) {
      setActiveTab(requestedWorkspace);
    }
  }, [activeTab, searchParams]);

  const handleTabChange = (value: string) => {
    const nextTab = isLeavePolicyWorkspaceKey(value) ? value : 'leave-types';
    setActiveTab(nextTab);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set('workspace', nextTab);
      return nextParams;
    }, { replace: true });
  };

  if (capabilitiesLoading) {
    return (
      <ModuleLayout archetype="governance-workspace" maxWidth="7xl">
        <ModuleLayout.Header
          eyebrow="Leave"
          title="Leave Policies"
          description="Manage leave types, workflows, notifications, analytics, and balance operations from one governance workspace."
        />
        <AdminWorkspaceLoadingSkeleton
          title="Loading leave policies"
          description="Checking leave-policy capabilities and preparing the latest policy data."
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout archetype="governance-workspace" maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow="Leave"
        title="Leave Policies"
        description="Manage leave policies, routing, notifications, analytics, and balance adjustments."
        metaSlot={(
          <>
            <ContextChip tone={capabilities.canManageLeaveTypes ? 'success' : 'warning'}>
              {capabilities.canManageLeaveTypes ? 'Mode: editable governance' : 'Mode: read-only governance'}
            </ContextChip>
            <ContextChip className="hidden sm:inline-flex">Scope: organization-wide</ContextChip>
          </>
        )}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-5"
      >
        <LeaveWorkspaceLead
          variant="governance"
          title="Governance workspace"
          description="Choose a governance area, then work inside the active workspace below."
          modeLabel={capabilities.canManageLeaveTypes ? 'Editable governance' : 'Read-only governance'}
          showOverviewCards={false}
          metaSlot={(
            <>
              <ContextChip className="rounded-full">7 workspaces</ContextChip>
              <ContextChip className="rounded-full">
                {isCoreWorkspace(activeTab) ? 'Core governance' : 'Extended governance'}
              </ContextChip>
            </>
          )}
          navigation={isMobile ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Choose workspace</p>
                <p className="text-sm text-muted-foreground">
                  Keep the active task in view without scanning every workspace at once.
                </p>
              </div>
              <Select value={activeTab} onValueChange={handleTabChange}>
                <SelectTrigger aria-label="Select leave policy workspace" className="rounded-2xl">
                  <SelectValue placeholder="Select a workspace" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_POLICY_WORKSPACES.map((workspace) => (
                    <SelectItem key={workspace.key} value={workspace.key}>
                      {workspace.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted/70 p-2 text-muted-foreground">
                    <ActiveWorkspaceIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Current workspace
                    </p>
                    <p className="text-sm font-semibold text-foreground">{activeWorkspace.label}</p>
                    <p className="text-sm text-muted-foreground">{activeWorkspace.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
              <section className="space-y-4 rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Governance navigation
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Core workspaces stay pinned first. Extended oversight stays nearby without crowding the active workspace.
                  </p>
                </div>

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Core workspaces</p>
                  <TabsList className="flex h-auto w-full flex-col gap-2 border-0 bg-transparent p-0">
                    {coreWorkspaces.map((workspace) => (
                      <WorkspaceNavTrigger
                        key={workspace.key}
                        value={workspace.key}
                        label={workspace.label}
                        description={workspace.description}
                        icon={workspace.icon}
                      />
                    ))}
                  </TabsList>
                </section>

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Extended governance</p>
                  <TabsList className="flex h-auto w-full flex-col gap-2 border-0 bg-transparent p-0">
                    {extendedWorkspaces.map((workspace) => (
                      <WorkspaceNavTrigger
                        key={workspace.key}
                        value={workspace.key}
                        label={workspace.label}
                        description={workspace.description}
                        icon={workspace.icon}
                        compact
                      />
                    ))}
                  </TabsList>
                </section>
              </section>

              <section className="space-y-4 rounded-2xl border border-border/70 bg-background/75 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-muted/70 p-2 text-muted-foreground">
                    <ActiveWorkspaceIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Current workspace
                    </p>
                    <h3 className="text-base font-semibold text-foreground">{activeWorkspace.label}</h3>
                    <p className="text-sm text-muted-foreground">{activeWorkspace.description}</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Scope
                    </p>
                    <div className="mt-2 flex items-start gap-2">
                      <Layers3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                        Organization-wide controls for policy, routing, notification, and audit.
                    </p>
                  </div>
                </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Access
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {capabilities.canManageLeaveTypes
                        ? 'You can edit configuration and operational settings in authorized workspaces.'
                        : 'You can review governance data here, but editing remains restricted.'}
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        />

        <ModuleLayout.Content>
          <LeavePoliciesSection
            leaveTypes={leaveTypes}
            leaveTypesLoading={leaveTypesLoading}
            canManageLeaveTypes={capabilities.canManageLeaveTypes}
            departments={departments}
            onCreateLeaveType={handleCreateLeaveType}
            onEditLeaveType={handleEditLeaveType}
            onDeleteLeaveType={openDeleteLeaveTypeDialog}
          />
        </ModuleLayout.Content>

        <ModuleLayout.Summary surfaceVariant="flat">
          <SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="lg" />
        </ModuleLayout.Summary>
      </Tabs>

      <AdminLeaveTypeDialogs
        editLeaveTypeDialogOpen={editLeaveTypeDialogOpen}
        onEditLeaveTypeDialogOpenChange={setEditLeaveTypeDialogOpen}
        createLeaveTypeDialogOpen={createLeaveTypeDialogOpen}
        onCreateLeaveTypeDialogOpenChange={setCreateLeaveTypeDialogOpen}
        deleteLeaveTypeDialogOpen={deleteLeaveTypeDialogOpen}
        onDeleteLeaveTypeDialogOpenChange={setDeleteLeaveTypeDialogOpen}
        selectedLeaveType={selectedLeaveType}
        leaveTypeForm={leaveTypeForm}
        onLeaveTypeFormChange={setLeaveTypeForm}
        onSaveLeaveType={handleSaveLeaveType}
        onSaveNewLeaveType={handleSaveNewLeaveType}
        onDeleteLeaveType={handleDeleteLeaveType}
        updateLeaveTypePending={updateLeaveTypePending}
        createLeaveTypePending={createLeaveTypePending}
        deleteLeaveTypePending={deleteLeaveTypePending}
      />
    </ModuleLayout>
  );
}
