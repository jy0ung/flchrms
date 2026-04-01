import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FileText,
  GitBranch,
  History,
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
          eyebrow="Governance"
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
        eyebrow="Governance"
        title="Leave Policies"
        description="Manage leave types, workflows, notifications, analytics, and balance adjustments from one governance workspace."
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
        <ModuleLayout.WorkspaceLead
          eyebrow="Workspace selection"
          title="Policy workspaces"
          description="Choose the governance area that matches your next admin task, then work within the active surface below."
        >
          {isMobile ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Choose workspace</p>
                <p className="text-sm text-muted-foreground">
                  Core policy work stays first, while extended governance tools stay available without crowding the page.
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
            </div>
          ) : (
            <div className="space-y-4">
              <section className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Core workspaces</p>
                  <p className="text-sm text-muted-foreground">
                    The most common policy, operations, and routing surfaces stay front and center.
                  </p>
                </div>
                <TabsList className="grid h-auto w-full grid-cols-1 gap-2 border-0 bg-transparent p-0 lg:grid-cols-3">
                  {coreWorkspaces.map((workspace) => {
                    const Icon = workspace.icon;
                    return (
                      <TabsTrigger
                        key={workspace.key}
                        value={workspace.key}
                        className="flex h-auto min-h-[88px] items-start justify-start gap-3 whitespace-normal rounded-2xl border border-border/70 bg-muted/25 px-4 py-3 text-left text-sm leading-5 data-[state=active]:border-primary/35 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        <div className="rounded-xl bg-muted/70 p-2 text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold text-foreground">{workspace.label}</p>
                          <p className="text-xs text-muted-foreground sm:text-sm">
                            {workspace.description}
                          </p>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Extended governance areas</p>
                  <p className="text-sm text-muted-foreground">
                    Secondary oversight surfaces stay available without competing with the core policy workflow.
                  </p>
                </div>
                <TabsList className="flex h-auto w-full flex-wrap gap-2 border-0 bg-transparent p-0">
                  {extendedWorkspaces.map((workspace) => (
                    <TabsTrigger
                      key={workspace.key}
                      value={workspace.key}
                      className="h-10 rounded-full border border-border/70 bg-muted/25 px-4 text-sm font-medium data-[state=active]:border-primary/35 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      {workspace.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </section>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">{activeWorkspace.label}</p>
                <p className="text-sm text-muted-foreground">{activeWorkspace.description}</p>
              </div>
              <ContextChip
                tone={capabilities.canManageLeaveTypes ? 'success' : 'warning'}
                className="shrink-0"
              >
                {capabilities.canManageLeaveTypes ? 'Editable workspace' : 'Read-only workspace'}
              </ContextChip>
            </div>
          </div>
        </ModuleLayout.WorkspaceLead>

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
