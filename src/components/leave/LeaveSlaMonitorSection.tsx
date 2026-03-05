import { useState, type ReactNode } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, Clock4, ShieldAlert, TimerReset } from 'lucide-react';
import { SurfaceSection } from '@/components/system/SurfaceSection';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRunLeaveSlaEscalation } from '@/hooks/useLeaveCoreV2';
import { useLeaveSlaMonitor } from '@/hooks/useLeaveSlaMonitor';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<'manager' | 'general_manager' | 'director', string> = {
  manager: 'Manager',
  general_manager: 'General Manager',
  director: 'Director',
};

export function LeaveSlaMonitorSection() {
  const { role } = useAuth();
  const { items, summary, isLoading, isError, error, refetch } = useLeaveSlaMonitor();
  const runEscalation = useRunLeaveSlaEscalation();
  const [lastRunSummary, setLastRunSummary] = useState<{
    dry_run?: boolean;
    scanned?: number;
    breached?: number;
    inserted?: number;
    skipped_existing?: number;
  } | null>(null);

  const canRunEscalation = role === 'admin' || role === 'hr' || role === 'director';

  const handleRunEscalation = async (dryRun: boolean) => {
    try {
      const payload = (await runEscalation.mutateAsync({
        dryRun,
        maxRows: 200,
        runTag: `UI_SLA_${Date.now()}`,
      })) as {
        dry_run?: boolean;
        scanned?: number;
        breached?: number;
        inserted?: number;
        skipped_existing?: number;
      };

      setLastRunSummary(payload);
      await refetch();
    } catch {
      // mutation hook surfaces a sanitized toast on failure
    }
  };

  return (
    <SurfaceSection
      title="Approval SLA Monitor"
      description="Track pending approvals, breach risk, and escalation targets by workflow stage."
      className="mt-4"
    >
      <div className="space-y-4">
        {canRunEscalation ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleRunEscalation(true)}
              disabled={runEscalation.isPending}
              data-testid="leave-sla-dry-run-btn"
            >
              {runEscalation.isPending ? 'Running…' : 'Dry-Run Escalation Scan'}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleRunEscalation(false)}
              disabled={runEscalation.isPending}
              data-testid="leave-sla-write-btn"
            >
              {runEscalation.isPending ? 'Writing…' : 'Write Escalation Decisions'}
            </Button>

            {lastRunSummary ? (
              <div className="text-xs text-muted-foreground" data-testid="leave-sla-last-run-summary">
                {lastRunSummary.dry_run ? 'Dry run' : 'Write run'}:
                {' '}
                scanned {lastRunSummary.scanned ?? 0},
                {' '}
                breached {lastRunSummary.breached ?? 0},
                {' '}
                inserted {lastRunSummary.inserted ?? 0},
                {' '}
                skipped {lastRunSummary.skipped_existing ?? 0}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard
            icon={<Clock4 className="h-4 w-4 text-muted-foreground" />}
            label="Pending"
            value={summary.pendingCount}
          />
          <MetricCard
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            label="Breached"
            value={summary.breachedCount}
            tone={summary.breachedCount > 0 ? 'critical' : 'neutral'}
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            label="At Risk"
            value={summary.atRiskCount}
            tone={summary.atRiskCount > 0 ? 'warning' : 'neutral'}
          />
          <MetricCard
            icon={<TimerReset className="h-4 w-4 text-muted-foreground" />}
            label="No Target"
            value={summary.noTargetCount}
          />
          <MetricCard
            icon={<Clock4 className="h-4 w-4 text-muted-foreground" />}
            label="Avg Elapsed (h)"
            value={summary.averageElapsedHours}
          />
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Pending</th>
                <th className="px-3 py-2 font-medium">Breached</th>
                <th className="px-3 py-2 font-medium">At Risk</th>
              </tr>
            </thead>
            <tbody>
              {summary.byStage.map((row) => (
                <tr key={row.stage} className="border-t border-border">
                  <td className="px-3 py-2">{STAGE_LABELS[row.stage]}</td>
                  <td className="px-3 py-2">{row.pending}</td>
                  <td className="px-3 py-2">{row.breached}</td>
                  <td className="px-3 py-2">{row.atRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Stage</th>
                <th className="px-3 py-2 font-medium">Elapsed</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Escalation</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                    Loading SLA queue…
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="px-3 py-3 text-destructive" colSpan={5}>
                    {(error as Error)?.message ?? 'Failed to load SLA queue.'}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-muted-foreground" colSpan={5}>
                    No pending approval requests in SLA scope.
                  </td>
                </tr>
              ) : (
                items.slice(0, 12).map((item) => (
                  <tr key={item.requestId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{item.employeeName}</span>
                        <span className="text-muted-foreground">{item.employeeEmail}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{STAGE_LABELS[item.stage]}</Badge>
                        {item.breached ? (
                          <Badge className="bg-destructive/15 text-destructive border-destructive/30">Breached</Badge>
                        ) : item.atRisk ? (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/30">At Risk</Badge>
                        ) : (
                          <Badge variant="secondary">Within SLA</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span>{item.elapsedHours}h</span>
                        <span className="text-muted-foreground">
                          since {formatDistanceToNowStrict(new Date(item.stageEnteredAt), { addSuffix: true })}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {item.targetHours != null ? (
                        <span>{item.targetHours}h</span>
                      ) : (
                        <span className="text-muted-foreground">Unset</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.escalationToStage ? (
                        STAGE_LABELS[item.escalationToStage]
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SurfaceSection>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = 'neutral',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: 'neutral' | 'warning' | 'critical';
}) {
  return (
    <div
      className={cn(
        'rounded-md border border-border p-3',
        tone === 'warning' && 'border-amber-400/30 bg-amber-500/5',
        tone === 'critical' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
    </div>
  );
}
