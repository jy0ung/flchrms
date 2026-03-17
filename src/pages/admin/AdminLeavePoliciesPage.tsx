import { useMemo, useState } from 'react';
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
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { useAdminLeaveTypeManagement } from '@/hooks/admin/useAdminLeaveTypeManagement';
import { LeavePoliciesSection } from '@/components/admin/LeavePoliciesSection';
import { AdminLeaveTypeDialogs } from '@/components/admin/AdminLeaveTypeDialogs';
import { ContextChip, RouteLoadingState } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { ModuleLayout } from '@/layouts/ModuleLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function AdminLeavePoliciesPage() {
  usePageTitle('Admin · Leave Policies');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: departments } = useDepartments();
  const { data: leaveTypes, isLoading: leaveTypesLoading } = useLeaveTypes();
  const [activeTab, setActiveTab] = useState<LeavePolicySubTabKey>('leave-types');

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
      {
        id: 'access-mode',
        label: 'Access mode',
        value: capabilities.canManageLeaveTypes ? 'Editable' : 'Read only',
        helper: capabilities.canManageLeaveTypes
          ? 'Changes can be published from this governance workspace.'
          : 'Policy state is visible here, but edits are locked for your role.',
        icon: Settings2,
        tone: capabilities.canManageLeaveTypes ? 'success' : 'warning',
      },
      {
        id: 'active-workspace',
        label: 'Active workspace',
        value: activeWorkspace.label,
        helper: activeWorkspace.description,
        icon: activeWorkspace.icon,
      },
    ],
    [activeWorkspace, capabilities.canManageLeaveTypes, departments, leaveTypes],
  );

  if (capabilitiesLoading) {
    return (
      <ModuleLayout maxWidth="7xl">
        <ModuleLayout.Header
          eyebrow="Governance"
          title="Leave Policies"
          description="Manage leave types, workflows, notifications, analytics, and balance operations from one governance workspace."
        />
        <RouteLoadingState
          title="Loading leave policies"
          description="Checking leave-policy capabilities and preparing the latest policy data."
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout maxWidth="7xl">
      <ModuleLayout.Header
        eyebrow="Governance"
        title="Leave Policies"
        description={
          capabilities.canManageLeaveTypes
            ? 'Manage leave types, approval workflows, notification rules, analytics simulations, and balance adjustments from one governance workspace.'
            : 'Review leave policy, workflow, and balance adjustment state. Editing requires leave-policy management capability.'
        }
        metaSlot={(
          <>
            <ContextChip tone={capabilities.canManageLeaveTypes ? 'success' : 'warning'}>
              {capabilities.canManageLeaveTypes ? 'Mode: editable governance' : 'Mode: read-only governance'}
            </ContextChip>
            <ContextChip>Scope: organization-wide</ContextChip>
          </>
        )}
      />

      <SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="lg" />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as LeavePolicySubTabKey)}
        className="space-y-4"
      >
        <ModuleLayout.Toolbar
          surfaceVariant="flat"
          ariaLabel="Leave policy workspaces"
        >
          <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl bg-muted/40 p-1">
            {LEAVE_POLICY_WORKSPACES.map((workspace) => {
              const Icon = workspace.icon;
              return (
                <TabsTrigger
                  key={workspace.key}
                  value={workspace.key}
                  className="flex h-auto shrink-0 items-center gap-2 px-3 py-2 text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4" />
                  <span>{workspace.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

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
        </ModuleLayout.Toolbar>

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
