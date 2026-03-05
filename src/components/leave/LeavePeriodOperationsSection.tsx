import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { SurfaceSection } from '@/components/system/SurfaceSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLeaveClosePeriod, useLeaveExportPayrollInputs } from '@/hooks/useLeaveCoreV2';
import { sanitizeErrorMessage } from '@/lib/error-utils';

type ClosePeriodPayload = {
  period_start?: string;
  period_end?: string;
  dry_run?: boolean;
  planned_snapshot_rows?: number;
  snapshot_rows?: number;
  payroll_export_id?: string;
};

type ExportPayload = {
  export_id?: string;
  dry_run?: boolean;
  employees?: number;
  period_start?: string;
  period_end?: string;
  payload?: Array<{
    employee_id?: string;
    total_units?: number;
    total_unpaid_units?: number;
    leave_items?: Array<{
      leave_type_id?: string;
      approved_units?: number;
      unpaid_units?: number;
      request_count?: number;
    }>;
  }>;
};

export function LeavePeriodOperationsSection() {
  const now = new Date();
  const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [notes, setNotes] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [closeSummary, setCloseSummary] = useState<ClosePeriodPayload | null>(null);
  const [exportSummary, setExportSummary] = useState<ExportPayload | null>(null);

  const closePeriod = useLeaveClosePeriod();
  const exportPayroll = useLeaveExportPayrollInputs();

  const exportReconciliation = useMemo(() => {
    const items = Array.isArray(exportSummary?.payload) ? exportSummary.payload : [];
    const totalUnits = items.reduce((sum, item) => sum + Number(item.total_units ?? 0), 0);
    const totalUnpaidUnits = items.reduce((sum, item) => sum + Number(item.total_unpaid_units ?? 0), 0);
    const totalLeaveItems = items.reduce(
      (sum, item) => sum + (Array.isArray(item.leave_items) ? item.leave_items.length : 0),
      0,
    );

    return {
      employeeRows: items.length,
      totalUnits,
      totalUnpaidUnits,
      totalLeaveItems,
      topRows: items.slice(0, 6),
    };
  }, [exportSummary]);

  const handleClosePeriod = async () => {
    setErrorMessage(null);
    try {
      const payload = (await closePeriod.mutateAsync({
        periodStart,
        periodEnd,
        notes: notes.trim() || undefined,
        dryRun,
      })) as ClosePeriodPayload;
      setCloseSummary(payload);
    } catch (error) {
      setErrorMessage(sanitizeErrorMessage(error as Error));
    }
  };

  const handleExport = async () => {
    setErrorMessage(null);
    try {
      const payload = (await exportPayroll.mutateAsync({
        periodStart,
        periodEnd,
        dryRun,
      })) as ExportPayload;
      setExportSummary(payload);
    } catch (error) {
      setErrorMessage(sanitizeErrorMessage(error as Error));
    }
  };

  return (
    <SurfaceSection
      title="Period Close & Payroll Export"
      description="Execute leave period snapshot and payroll inputs export for month-end operations."
      className="mt-4"
      data-testid="leave-period-ops-section"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave-period-start">Period Start</Label>
            <Input
              id="leave-period-start"
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
              data-testid="leave-period-start-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-period-end">Period End</Label>
            <Input
              id="leave-period-end"
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
              data-testid="leave-period-end-input"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="leave-period-notes">Close Notes (Optional)</Label>
          <Textarea
            id="leave-period-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Month-end close notes"
            data-testid="leave-period-notes-input"
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="leave-period-dry-run-switch" className="text-sm font-medium">
              Dry Run
            </Label>
            <p className="text-xs text-muted-foreground">
              Preview close/export results without writing snapshots or payroll export rows.
            </p>
          </div>
          <Switch
            id="leave-period-dry-run-switch"
            checked={dryRun}
            onCheckedChange={setDryRun}
            data-testid="leave-period-dry-run-switch"
          />
        </div>

        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleClosePeriod()}
            disabled={closePeriod.isPending || exportPayroll.isPending}
            data-testid="leave-period-close-btn"
          >
            {closePeriod.isPending ? 'Closing Period…' : dryRun ? 'Dry Run Close Period' : 'Close Period'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleExport()}
            disabled={closePeriod.isPending || exportPayroll.isPending}
            data-testid="leave-period-export-btn"
          >
            {exportPayroll.isPending ? 'Exporting…' : dryRun ? 'Dry Run Export Inputs' : 'Export Payroll Inputs'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-md border border-border p-3 text-xs">
            <p className="font-medium mb-2">Close Period Result</p>
            {closeSummary ? (
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <dt>Mode</dt>
                  <dd className="text-foreground">
                    {closeSummary.dry_run ? 'Dry run' : 'Write'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Period</dt>
                  <dd className="text-foreground">
                    {closeSummary.period_start ?? periodStart} to {closeSummary.period_end ?? periodEnd}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Snapshot Rows</dt>
                  <dd className="text-foreground" data-testid="leave-period-close-snapshot-rows">
                    {closeSummary.snapshot_rows ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Planned Snapshot Rows</dt>
                  <dd className="text-foreground" data-testid="leave-period-close-planned-rows">
                    {closeSummary.planned_snapshot_rows ?? closeSummary.snapshot_rows ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Payroll Export ID</dt>
                  <dd className="text-foreground font-mono text-[11px]" data-testid="leave-period-close-export-id">
                    {closeSummary.payroll_export_id ?? (closeSummary.dry_run ? 'dry-run' : 'n/a')}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">No close run executed yet.</p>
            )}
          </div>

          <div className="rounded-md border border-border p-3 text-xs">
            <p className="font-medium mb-2">Export Result</p>
            {exportSummary ? (
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex items-center justify-between">
                  <dt>Mode</dt>
                  <dd className="text-foreground">
                    {exportSummary.dry_run ? 'Dry run' : 'Write'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Period</dt>
                  <dd className="text-foreground">
                    {exportSummary.period_start ?? periodStart} to {exportSummary.period_end ?? periodEnd}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Employees Included</dt>
                  <dd className="text-foreground" data-testid="leave-period-export-employees">
                    {exportSummary.employees ?? 0}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Export ID</dt>
                  <dd className="text-foreground font-mono text-[11px]" data-testid="leave-period-export-id">
                    {exportSummary.export_id ?? (exportSummary.dry_run ? 'dry-run' : 'n/a')}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Total Units</dt>
                  <dd className="text-foreground" data-testid="leave-period-export-total-units">
                    {exportReconciliation.totalUnits.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Total Unpaid Units</dt>
                  <dd className="text-foreground" data-testid="leave-period-export-total-unpaid">
                    {exportReconciliation.totalUnpaidUnits.toFixed(2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Leave Type Rows</dt>
                  <dd className="text-foreground" data-testid="leave-period-export-item-count">
                    {exportReconciliation.totalLeaveItems}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">No payroll export executed yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border p-3 text-xs" data-testid="leave-period-export-reconciliation">
          <p className="font-medium mb-2">Export Reconciliation Preview</p>
          {!exportSummary ? (
            <p className="text-muted-foreground">Run payroll export to inspect employee-level totals.</p>
          ) : exportReconciliation.employeeRows === 0 ? (
            <p className="text-muted-foreground">No approved leave rows found in the selected period.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                <span>
                  Employee rows: <strong className="text-foreground">{exportReconciliation.employeeRows}</strong>
                </span>
                <span>
                  Preview rows: <strong className="text-foreground">{exportReconciliation.topRows.length}</strong>
                </span>
              </div>
              <div className="overflow-x-auto rounded border border-border">
                <table className="w-full min-w-[34rem] text-[11px]">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-2 py-1.5 font-medium">Employee ID</th>
                      <th className="px-2 py-1.5 font-medium">Total Units</th>
                      <th className="px-2 py-1.5 font-medium">Total Unpaid</th>
                      <th className="px-2 py-1.5 font-medium">Leave Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportReconciliation.topRows.map((item, index) => (
                      <tr className="border-t border-border" key={`${item.employee_id ?? 'row'}-${index}`}>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                          {item.employee_id ?? 'unknown'}
                        </td>
                        <td className="px-2 py-1.5 text-foreground">{Number(item.total_units ?? 0).toFixed(2)}</td>
                        <td className="px-2 py-1.5 text-foreground">
                          {Number(item.total_unpaid_units ?? 0).toFixed(2)}
                        </td>
                        <td className="px-2 py-1.5 text-foreground">
                          {Array.isArray(item.leave_items) ? item.leave_items.length : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </SurfaceSection>
  );
}
