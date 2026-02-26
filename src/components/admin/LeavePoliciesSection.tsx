import { Edit, Plus, Trash2 } from 'lucide-react';
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
import { DataTableShell, StatusBadge } from '@/components/system';
import { LeaveWorkflowBuildersSection } from '@/components/admin/LeaveWorkflowBuildersSection';
import { NotificationQueueOpsSection } from '@/components/admin/NotificationQueueOpsSection';
import { WorkflowConfigAuditSection } from '@/components/admin/WorkflowConfigAuditSection';
import type { Department, LeaveType } from '@/types/hrms';

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
  return (
    <div className="space-y-4">
      <DataTableShell
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
                  <div key={leaveType.id} className="rounded-xl border p-4 shadow-sm">
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
                      <Badge variant="secondary">
                        {leaveType.min_days === 0 ? 'No notice' : `${leaveType.min_days ?? 0} day(s) notice`}
                      </Badge>
                      <StatusBadge status={leaveType.is_paid ? 'paid' : 'unpaid'} />
                      <StatusBadge
                        status={leaveType.requires_document ? 'warning' : 'info'}
                        labelOverride={leaveType.requires_document ? 'Required' : 'Optional'}
                      />
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
                  <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No leave types configured. Add your first leave type.
                  </div>
                )}
              </div>

              <div className="hidden rounded-xl border md:block">
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Days Allowed</TableHead>
                        <TableHead>Advance Notice</TableHead>
                        <TableHead>Paid Leave</TableHead>
                        <TableHead>Document Required</TableHead>
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
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-destructive hover:text-destructive"
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
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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

      <LeaveWorkflowBuildersSection departments={departments} />
      <WorkflowConfigAuditSection departments={departments} />
      <NotificationQueueOpsSection />
    </div>
  );
}
