import { useState } from 'react';
import { BarChart3, Edit, FileText, GitBranch, History, Mail, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTableShell, StatusBadge } from '@/components/system';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveWorkflowBuildersSection } from '@/components/admin/LeaveWorkflowBuildersSection';
import { NotificationQueueOpsSection } from '@/components/admin/NotificationQueueOpsSection';
import { WorkflowConfigAuditSection } from '@/components/admin/WorkflowConfigAuditSection';
import { LeavePolicyAnalyticsSection } from '@/components/admin/LeavePolicyAnalyticsSection';
import { LeaveDisplayCustomizeDialog } from '@/components/leave/LeaveDisplayCustomizeDialog';
import { LeaveDelegationsSection } from '@/components/leave/LeaveDelegationsSection';
import { LeavePeriodOperationsSection } from '@/components/leave/LeavePeriodOperationsSection';
import { LeaveSlaMonitorSection } from '@/components/leave/LeaveSlaMonitorSection';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import { useLeaveDisplayPrefs } from '@/hooks/useLeaveDisplayConfig';
import type { Department, LeaveType } from '@/types/hrms';
import type { LeavePolicySubTabKey } from '@/components/admin/admin-ui-constants';

interface LeavePoliciesSectionProps {
  leaveTypes?: LeaveType[];
  leaveTypesLoading: boolean;
  canManageLeaveTypes: boolean;
  departments?: Department[];
  onCreateLeaveType: () => void;
  onEditLeaveType: (leaveType: LeaveType) => void;
  onDeleteLeaveType: (leaveType: LeaveType) => void;
}

export function LeavePoliciesSection({
  leaveTypes,
  leaveTypesLoading,
  canManageLeaveTypes,
  departments,
  onCreateLeaveType,
  onEditLeaveType,
  onDeleteLeaveType,
}: LeavePoliciesSectionProps) {
  const { user, role } = useAuth();
  const { data: myBalances } = useLeaveBalance();
  const [displayCustomizeOpen, setDisplayCustomizeOpen] = useState(false);
  const {
    prefs: leaveDisplayPrefs,
    hiddenBalances,
    updatePrefs: updateLeaveDisplayPrefs,
    resetPrefs: resetLeaveDisplayPrefs,
  } = useLeaveDisplayPrefs(user?.id, role ?? undefined, myBalances ?? []);

  const getPolicyVersion = (leaveType: LeaveType) => {
    if (!leaveType.updated_at || leaveType.updated_at === leaveType.created_at) return 'v1';
    return 'v2';
  };

  const getEffectiveDate = (leaveType: LeaveType) => format(new Date(leaveType.created_at), 'MMM d, yyyy');
  const getLastModifiedDate = (leaveType: LeaveType) =>
    format(new Date(leaveType.updated_at ?? leaveType.created_at), 'MMM d, yyyy');

  return (
    <Tabs defaultValue={'leave-types' satisfies LeavePolicySubTabKey} className="space-y-4">
      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg p-1 md:grid-cols-6">
        <TabsTrigger value="leave-types" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <FileText className="w-4 h-4" />
          <span className="truncate">Leave Types</span>
        </TabsTrigger>
        <TabsTrigger value="operations" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <History className="w-4 h-4" />
          <span className="truncate">Operations</span>
        </TabsTrigger>
        <TabsTrigger value="workflow-builders" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <GitBranch className="w-4 h-4" />
          <span className="truncate">Workflow Builders</span>
        </TabsTrigger>
        <TabsTrigger value="workflow-audit" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <History className="w-4 h-4" />
          <span className="truncate">Workflow Audit</span>
        </TabsTrigger>
        <TabsTrigger value="notification-queue" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <Mail className="w-4 h-4" />
          <span className="truncate">Notification Queue</span>
        </TabsTrigger>
        <TabsTrigger value="analytics-simulation" className="flex h-auto items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <BarChart3 className="w-4 h-4" />
          <span className="truncate">Analytics</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="leave-types" className="space-y-4">
      <DataTableShell
        density="compact"
        title="Leave Policy Configuration"
        description="Configure leave types, advance notice, and document requirements"
        headerActions={
          canManageLeaveTypes ? (
            <Button className="w-full rounded-full sm:w-auto" onClick={onCreateLeaveType}>
              <Plus className="w-4 h-4 mr-2" />
              Add Leave Type
            </Button>
          ) : null
        }
        loading={leaveTypesLoading}
        loadingSkeleton={
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        }
        content={
          <>
              <div className="space-y-3 md:hidden">
                {leaveTypes?.map((leaveType) => (
                  <div key={leaveType.id} className="rounded-lg border p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{leaveType.name}</p>
                        {leaveType.description && (
                          <p className="text-sm text-muted-foreground">{leaveType.description}</p>
                        )}
                      </div>
                      <Badge variant="outline">{leaveType.days_allowed} days/year</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{getPolicyVersion(leaveType)}</Badge>
                      <StatusBadge status="success" labelOverride="Published" />
                      <Badge variant="secondary">
                        {leaveType.min_days === 0 ? 'No notice' : `${leaveType.min_days ?? 0} day(s) notice`}
                      </Badge>
                      <StatusBadge status={leaveType.is_paid ? 'paid' : 'unpaid'} />
                      <StatusBadge
                        status={leaveType.requires_document ? 'warning' : 'info'}
                        labelOverride={leaveType.requires_document ? 'Required' : 'Optional'}
                      />
                    </div>
                    <div className="mt-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
                      Effective {getEffectiveDate(leaveType)} · Last modified {getLastModifiedDate(leaveType)} · by System
                    </div>
                    {canManageLeaveTypes && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => onEditLeaveType(leaveType)}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => onDeleteLeaveType(leaveType)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {(!leaveTypes || leaveTypes.length === 0) && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No leave types configured. Add your first leave type.
                  </div>
                )}
              </div>

              <div className="hidden rounded-lg border md:block">
                <div className="overflow-x-auto">
                  <Table className="min-w-[1320px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead>Days Allowed</TableHead>
                        <TableHead>Advance Notice</TableHead>
                        <TableHead>Paid Leave</TableHead>
                        <TableHead>Document Required</TableHead>
                        <TableHead>Last Modified By</TableHead>
                        <TableHead>Last Modified Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaveTypes?.map((leaveType) => (
                        <TableRow key={leaveType.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{leaveType.name}</p>
                              {leaveType.description && (
                                <p className="text-sm text-muted-foreground">{leaveType.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getPolicyVersion(leaveType)}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status="success" labelOverride="Published" />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getEffectiveDate(leaveType)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{leaveType.days_allowed} days/year</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {leaveType.min_days === 0 ? 'No notice' : `${leaveType.min_days ?? 0} day(s) notice`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={leaveType.is_paid ? 'paid' : 'unpaid'} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={leaveType.requires_document ? 'warning' : 'info'}
                              labelOverride={leaveType.requires_document ? 'Required' : 'Optional'}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">System</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getLastModifiedDate(leaveType)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canManageLeaveTypes && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full"
                                    onClick={() => onEditLeaveType(leaveType)}
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    aria-label={`Delete leave type ${leaveType.name}`}
                                    onClick={() => onDeleteLeaveType(leaveType)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!leaveTypes || leaveTypes.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                            No leave types configured. Add your first leave type.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
          </>
        }
      />
      </TabsContent>

      <TabsContent value="operations" className="space-y-4">
        <DataTableShell
          density="compact"
          title="Leave Operations & Settings"
          description="Configure delegation/escalation operations and manage leave display settings outside request forms."
          headerActions={
            <Button type="button" variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setDisplayCustomizeOpen(true)}>
              Customize Balance Display
            </Button>
          }
          content={
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{leaveDisplayPrefs.visibleIds.length}</span> leave type cards.
                {' '}
                Hidden: <span className="font-medium text-foreground">{hiddenBalances.length}</span>.
              </div>
              <LeaveDelegationsSection />
              <LeaveSlaMonitorSection />
              <LeavePeriodOperationsSection />
            </div>
          }
        />

        <LeaveDisplayCustomizeDialog
          open={displayCustomizeOpen}
          onOpenChange={setDisplayCustomizeOpen}
          balances={myBalances ?? []}
          currentPrefs={leaveDisplayPrefs}
          onSave={updateLeaveDisplayPrefs}
          onReset={resetLeaveDisplayPrefs}
        />
      </TabsContent>

      <TabsContent value="workflow-builders" className="space-y-4">
        <LeaveWorkflowBuildersSection departments={departments} />
      </TabsContent>

      <TabsContent value="workflow-audit" className="space-y-4">
        <WorkflowConfigAuditSection departments={departments} />
      </TabsContent>

      <TabsContent value="notification-queue" className="space-y-4">
        <NotificationQueueOpsSection />
      </TabsContent>

      <TabsContent value="analytics-simulation" className="space-y-4">
        <LeavePolicyAnalyticsSection departments={departments} />
      </TabsContent>
    </Tabs>
  );
}
