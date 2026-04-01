import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Plus, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { DataTableShell } from '@/components/system';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import {
  useCreateLeaveBalanceAdjustment,
  useLeaveBalanceAdjustments,
} from '@/hooks/admin/useLeaveBalanceAdjustments';
import { canAdjustLeaveBalance } from '@/lib/permissions';
import type { LeaveType } from '@/types/hrms';

interface LeaveBalanceAdjustmentsSectionProps {
  leaveTypes?: LeaveType[];
  canManageLeavePolicies: boolean;
}

function formatDayValue(value: number, isUnlimited: boolean): string {
  if (isUnlimited) return 'Unlimited';
  return `${value}`;
}

function formatBalanceSnapshot(value: number | null, isUnlimited: boolean): string {
  if (isUnlimited) return 'Unlimited';
  if (value === null || Number.isNaN(value)) return '—';
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.?0+$/, '');
}

export function LeaveBalanceAdjustmentsSection({
  leaveTypes,
  canManageLeavePolicies,
}: LeaveBalanceAdjustmentsSectionProps) {
  const { role } = useAuth();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedLeaveTypeFilter, setSelectedLeaveTypeFilter] = useState<string>('all');
  const [asOfDate, setAsOfDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLeaveTypeId, setFormLeaveTypeId] = useState('');
  const [formDays, setFormDays] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [formReason, setFormReason] = useState('');

  useEffect(() => {
    if (selectedEmployeeId || !employees?.length) return;
    setSelectedEmployeeId(employees[0].id);
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (formLeaveTypeId || !leaveTypes?.length) return;
    setFormLeaveTypeId(leaveTypes[0].id);
  }, [formLeaveTypeId, leaveTypes]);

  const selectedEmployee = useMemo(
    () => employees?.find((employee) => employee.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId],
  );

  const balanceQuery = useLeaveBalance(selectedEmployeeId || undefined, asOfDate || undefined);

  const adjustmentsQuery = useLeaveBalanceAdjustments(selectedEmployeeId || undefined, {
    leaveTypeId: selectedLeaveTypeFilter === 'all' ? null : selectedLeaveTypeFilter,
  });

  const createAdjustment = useCreateLeaveBalanceAdjustment();
  const canCreateAdjustments = canManageLeavePolicies && canAdjustLeaveBalance(role);

  const onSubmitAdjustment = async () => {
    if (!canCreateAdjustments || !selectedEmployeeId || !formLeaveTypeId) return;

    const parsed = Number(formDays);
    if (!Number.isFinite(parsed) || parsed === 0) return;

    await createAdjustment.mutateAsync({
      employeeId: selectedEmployeeId,
      leaveTypeId: formLeaveTypeId,
      adjustmentDays: parsed,
      effectiveDate: formEffectiveDate,
      reason: formReason.trim(),
      metadata: {
        source: 'admin_leave_policies_balance_adjustments',
      },
    });

    setDialogOpen(false);
    setFormDays('');
    setFormReason('');
  };

  const isSubmitDisabled =
    !canCreateAdjustments ||
    createAdjustment.isPending ||
    !selectedEmployeeId ||
    !formLeaveTypeId ||
    !formEffectiveDate ||
    !formReason.trim() ||
    formReason.trim().length < 5 ||
    !Number.isFinite(Number(formDays)) ||
    Number(formDays) === 0;

  return (
    <div className="space-y-4">
      <DataTableShell
        density="compact"
        title="Balance Adjustments"
        description="Apply manual leave balance delta entries on top of automatic proration accrual. Entries are append-only and auditable."
        headerActions={
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                void balanceQuery.refetch();
                void adjustmentsQuery.refetch();
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              className="rounded-full"
              onClick={() => setDialogOpen(true)}
              disabled={!canCreateAdjustments || !selectedEmployeeId}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Adjustment
            </Button>
          </div>
        }
        content={
          <div className="space-y-4">
            {!canCreateAdjustments ? (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Read-only mode. You can review balance snapshots and adjustment history, but only authorized governance roles can create balance adjustments.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} disabled={employeesLoading || !employees?.length}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {(employees ?? []).map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} ({employee.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">As Of Date</Label>
                <Input type="date" value={asOfDate} onChange={(event) => setAsOfDate(event.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Adjustment Leave Type Filter</Label>
                <Select value={selectedLeaveTypeFilter} onValueChange={setSelectedLeaveTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All leave types</SelectItem>
                    {(leaveTypes ?? []).map((leaveType) => (
                      <SelectItem key={leaveType.id} value={leaveType.id}>
                        {leaveType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Selected Employee</Label>
                <div className="h-10 rounded-md border border-input bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {selectedEmployee
                    ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                    : 'No employee selected'}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Balance Breakdown</p>
                <p className="text-xs text-muted-foreground">Server-computed entitlement, accrual, manual adjustments, and remaining balance by leave type.</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="text-right">Annual Entitlement</TableHead>
                      <TableHead className="text-right">Auto Accrued</TableHead>
                      <TableHead className="text-right">Manual Adj.</TableHead>
                      <TableHead className="text-right">Entitled</TableHead>
                      <TableHead className="text-right">Used</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(balanceQuery.data ?? []).map((row) => (
                      <TableRow key={row.leave_type_id}>
                        <TableCell>{row.leave_type_name}</TableCell>
                        <TableCell className="text-right">{formatDayValue(row.annual_entitlement, row.is_unlimited)}</TableCell>
                        <TableCell className="text-right">{formatDayValue(row.auto_accrued_days, row.is_unlimited)}</TableCell>
                        <TableCell className="text-right">{formatDayValue(row.manual_adjustment_days, row.is_unlimited)}</TableCell>
                        <TableCell className="text-right">{formatDayValue(row.entitled_days, row.is_unlimited)}</TableCell>
                        <TableCell className="text-right">{row.days_used}</TableCell>
                        <TableCell className="text-right">{row.days_pending}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatDayValue(row.days_remaining, row.is_unlimited)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!balanceQuery.isLoading && (balanceQuery.data?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No balances available for selected employee.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2">
                <p className="text-sm font-medium">Adjustment History</p>
                <p className="text-xs text-muted-foreground">Append-only manual adjustments in the selected scope.</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Leave Type</TableHead>
                      <TableHead className="text-right">Delta Days</TableHead>
                      <TableHead className="text-right">Before</TableHead>
                      <TableHead className="text-right">After</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(adjustmentsQuery.data ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.effective_date}</TableCell>
                        <TableCell>{item.leave_type_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.adjustment_days > 0 ? `+${item.adjustment_days}` : item.adjustment_days}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBalanceSnapshot(item.previous_balance_days, item.previous_is_unlimited)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatBalanceSnapshot(item.new_balance_days, item.new_is_unlimited)}
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate" title={item.reason}>{item.reason}</TableCell>
                        <TableCell>{item.created_by_name ?? 'Unknown'}</TableCell>
                        <TableCell>{item.created_at ? format(new Date(item.created_at), 'yyyy-MM-dd HH:mm') : '—'}</TableCell>
                      </TableRow>
                    ))}
                    {!adjustmentsQuery.isLoading && (adjustmentsQuery.data?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No adjustments recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        }
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Balance Adjustment</DialogTitle>
            <DialogDescription>
              Add a signed day delta entry. Use positive values to grant days and negative values to deduct days.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Input
                value={selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name} (${selectedEmployee.email})` : ''}
                disabled
              />
            </div>

            <div className="space-y-1.5">
              <Label>Leave Type</Label>
              <Select value={formLeaveTypeId} onValueChange={setFormLeaveTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {(leaveTypes ?? []).map((leaveType) => (
                    <SelectItem key={leaveType.id} value={leaveType.id}>
                      {leaveType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Adjustment Days</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formDays}
                  onChange={(event) => setFormDays(event.target.value)}
                  placeholder="e.g. 1.5 or -2"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={formEffectiveDate}
                  onChange={(event) => setFormEffectiveDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                rows={3}
                value={formReason}
                onChange={(event) => setFormReason(event.target.value)}
                placeholder="Explain why this adjustment is needed (min 5 chars)."
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSubmitAdjustment()} disabled={isSubmitDisabled}>
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
