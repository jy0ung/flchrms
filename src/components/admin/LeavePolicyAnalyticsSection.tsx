import { useMemo, useState } from 'react';
import { BarChart3, Download, FlaskConical, Play, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SurfaceSection } from '@/components/system/SurfaceSection';
import {
  useGenerateLeaveLiabilitySnapshot,
  useLeaveCountryPackContext,
  useRunLeaveForecast,
  useSimulateLeaveAccrualScenario,
  useSimulateLeavePolicyChange,
} from '@/hooks/useLeaveCoreV2';
import type { Department } from '@/types/hrms';

interface LeavePolicyAnalyticsSectionProps {
  departments?: Department[];
}

function toFiniteNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoundedInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function buildRunTag(prefix: string): string {
  const compactUtc = new Date()
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replaceAll('T', '')
    .replaceAll('Z', '')
    .slice(0, 14);
  return `${prefix}_${compactUtc}`;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function LeavePolicyAnalyticsSection({ departments }: LeavePolicyAnalyticsSectionProps) {
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [horizonMonths, setHorizonMonths] = useState('6');
  const [countryCode, setCountryCode] = useState('MY');
  const [departmentId, setDepartmentId] = useState('__all__');
  const [runTag, setRunTag] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [accrualMultiplier, setAccrualMultiplier] = useState('1.05');
  const [consumptionMultiplier, setConsumptionMultiplier] = useState('1.00');
  const [carryoverCapDays, setCarryoverCapDays] = useState('40');
  const [simulationMonths, setSimulationMonths] = useState('6');

  const liabilitySnapshot = useGenerateLeaveLiabilitySnapshot();
  const leaveForecast = useRunLeaveForecast();
  const policySimulation = useSimulateLeavePolicyChange();
  const accrualSimulation = useSimulateLeaveAccrualScenario();

  const scope = useMemo(() => {
    const payload: Record<string, unknown> = {
      country_code: countryCode.trim().toUpperCase() || 'MY',
    };
    if (departmentId !== '__all__') {
      payload.department_id = departmentId;
    }
    return payload;
  }, [countryCode, departmentId]);

  const {
    data: countryPackContext,
    isLoading: countryPackContextLoading,
    isError: countryPackContextError,
  } = useLeaveCountryPackContext({
    asOf: asOfDate,
    countryCode: countryCode.trim().toUpperCase() || 'MY',
  });

  const latestForecast = leaveForecast.data;
  const latestLiability = liabilitySnapshot.data;
  const latestPolicySimulation = policySimulation.data;
  const latestAccrualSimulation = accrualSimulation.data;

  const hasAnyResult =
    Boolean(latestForecast) ||
    Boolean(latestLiability) ||
    Boolean(latestPolicySimulation) ||
    Boolean(latestAccrualSimulation);

  const resolvedRunTag = runTag.trim();

  const handleRunLiabilitySnapshot = async () => {
    try {
      const output = await liabilitySnapshot.mutateAsync({
        asOf: asOfDate,
        scope,
        dryRun,
        runTag: resolvedRunTag || buildRunTag('LEAVE_LIABILITY'),
      });

      toast.success('Liability snapshot completed', {
        description: `${output.planned_rows} planned rows, ${output.total_days.toFixed(2)} days.`,
      });
    } catch {
      // Hook-level mutation handlers already surface a sanitized error toast.
    }
  };

  const handleRunForecast = async () => {
    try {
      const months = toBoundedInt(horizonMonths, 6, 1, 24);
      const output = await leaveForecast.mutateAsync({
        asOf: asOfDate,
        horizonMonths: months,
        scope,
        dryRun,
        runTag: resolvedRunTag || buildRunTag('LEAVE_FORECAST'),
      });

      toast.success('Forecast completed', {
        description: `${output.horizon_months} months, ${output.total_projected_days.toFixed(2)} projected days.`,
      });
    } catch {
      // Hook-level mutation handlers already surface a sanitized error toast.
    }
  };

  const handleRunPolicySimulation = async () => {
    try {
      const months = toBoundedInt(horizonMonths, 6, 1, 24);
      const output = await policySimulation.mutateAsync({
        asOf: asOfDate,
        horizonMonths: months,
        scope,
        policyChanges: {
          accrual_multiplier: toFiniteNumber(accrualMultiplier, 1.05),
          consumption_multiplier: toFiniteNumber(consumptionMultiplier, 1),
          carryover_cap_days: toFiniteNumber(carryoverCapDays, 40),
        },
      });

      toast.success('Policy simulation completed', {
        description: `Delta amount ${output.delta_total_amount.toFixed(2)} ${output.currency_code}.`,
      });
    } catch {
      // Hook-level mutation handlers already surface a sanitized error toast.
    }
  };

  const handleRunAccrualSimulation = async () => {
    try {
      const months = toBoundedInt(simulationMonths, 6, 1, 24);
      const output = await accrualSimulation.mutateAsync({
        asOf: asOfDate,
        scope,
        scenario: {
          months,
          accrual_multiplier: toFiniteNumber(accrualMultiplier, 1.05),
        },
      });

      toast.success('Accrual simulation completed', {
        description: `Delta units ${output.delta_total_units.toFixed(2)} across ${output.employees} employees.`,
      });
    } catch {
      // Hook-level mutation handlers already surface a sanitized error toast.
    }
  };

  const handleExport = () => {
    if (!hasAnyResult) {
      toast.info('No analytics output to export yet.');
      return;
    }

    downloadJson(`leave-analytics-${Date.now()}.json`, {
      generated_at: new Date().toISOString(),
      as_of: asOfDate,
      dry_run: dryRun,
      scope,
      run_tag: resolvedRunTag || null,
      country_pack_context: countryPackContext ?? null,
      liability_snapshot: latestLiability ?? null,
      forecast: latestForecast ?? null,
      policy_simulation: latestPolicySimulation ?? null,
      accrual_simulation: latestAccrualSimulation ?? null,
    });

    toast.success('Analytics export downloaded');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SurfaceSection
          title="Run Controls"
          description="Configure deterministic inputs for forecast, liability, and simulation runs."
          className="xl:col-span-2"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="leave-analytics-as-of">As Of Date</Label>
              <Input
                id="leave-analytics-as-of"
                type="date"
                value={asOfDate}
                onChange={(event) => setAsOfDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-analytics-horizon">Horizon (Months)</Label>
              <Input
                id="leave-analytics-horizon"
                type="number"
                min={1}
                max={24}
                value={horizonMonths}
                onChange={(event) => setHorizonMonths(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-analytics-country">Country Code</Label>
              <Input
                id="leave-analytics-country"
                maxLength={2}
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-analytics-department">Department Scope</Label>
              <select
                id="leave-analytics-department"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="__all__">All departments</option>
                {departments?.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-analytics-tag">Run Tag (Optional)</Label>
              <Input
                id="leave-analytics-tag"
                placeholder="AUDIT_2026_03_05"
                value={runTag}
                onChange={(event) => setRunTag(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <label className="flex h-10 w-full items-center gap-2 rounded-md border border-input px-3 text-sm">
                <Checkbox checked={dryRun} onCheckedChange={(value) => setDryRun(value === true)} />
                Dry Run Only
              </label>
            </div>
          </div>
        </SurfaceSection>

        <SurfaceSection
          title="Country-Pack Context"
          description="Resolved policy source for this run."
          actions={
            <Badge variant={countryPackContextError ? 'destructive' : 'secondary'}>
              {countryPackContextError ? 'Resolution Failed' : 'Context Ready'}
            </Badge>
          }
        >
          {countryPackContextLoading ? (
            <p className="text-sm text-muted-foreground">Resolving context...</p>
          ) : countryPackContextError || !countryPackContext ? (
            <p className="text-sm text-muted-foreground">
              No country-pack context was resolved for the selected inputs.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Pack:</span> {countryPackContext.pack_code}
              </p>
              <p>
                <span className="font-medium">Policy Set:</span> {countryPackContext.policy_set_id}
              </p>
              <p>
                <span className="font-medium">Resolved By:</span> {countryPackContext.resolved_by}
              </p>
              <p>
                <span className="font-medium">Country:</span> {countryPackContext.country_code}
              </p>
            </div>
          )}
        </SurfaceSection>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SurfaceSection
          title="Forecast and Liability"
          description="Run dry or persisted analytics for approved policy baselines."
          className="xl:col-span-2"
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                onClick={() => void handleRunLiabilitySnapshot()}
                disabled={liabilitySnapshot.isPending}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                {liabilitySnapshot.isPending ? 'Running...' : 'Run Liability'}
              </Button>
              <Button onClick={() => void handleRunForecast()} disabled={leaveForecast.isPending}>
                <BarChart3 className="mr-2 h-4 w-4" />
                {leaveForecast.isPending ? 'Running...' : 'Run Forecast'}
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Liability Days</p>
              <p className="mt-1 text-2xl font-semibold">{latestLiability?.total_days.toFixed(2) ?? '-'}</p>
              <p className="text-xs text-muted-foreground">
                Planned rows: {latestLiability?.planned_rows ?? '-'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Liability Amount</p>
              <p className="mt-1 text-2xl font-semibold">
                {latestLiability
                  ? `${latestLiability.estimated_amount.toFixed(2)} ${latestLiability.currency_code}`
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                Written rows: {latestLiability?.written_rows ?? '-'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast Days</p>
              <p className="mt-1 text-2xl font-semibold">
                {latestForecast?.total_projected_days.toFixed(2) ?? '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                Employees: {latestForecast?.employees ?? '-'}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Forecast Amount</p>
              <p className="mt-1 text-2xl font-semibold">
                {latestForecast
                  ? `${latestForecast.total_projected_amount.toFixed(2)} ${latestForecast.currency_code}`
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                Horizon months: {latestForecast?.horizon_months ?? '-'}
              </p>
            </div>
          </div>
        </SurfaceSection>

        <SurfaceSection
          title="Export"
          description="Download audit-safe analytics payload."
          actions={
            <Button onClick={handleExport} variant="secondary" disabled={!hasAnyResult}>
              <Download className="mr-2 h-4 w-4" />
              Export JSON
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground">
            Export includes run context, resolved country-pack, and latest result payloads.
          </p>
        </SurfaceSection>
      </div>

      <SurfaceSection
        title="Simulation Workbench"
        description="Run policy-change and accrual simulations before publishing new policy versions."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={() => void handleRunPolicySimulation()}
              disabled={policySimulation.isPending}
            >
              <FlaskConical className="mr-2 h-4 w-4" />
              {policySimulation.isPending ? 'Running...' : 'Run Policy Simulation'}
            </Button>
            <Button
              onClick={() => void handleRunAccrualSimulation()}
              disabled={accrualSimulation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              {accrualSimulation.isPending ? 'Running...' : 'Run Accrual Simulation'}
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="policy-accrual-multiplier">Accrual Multiplier</Label>
            <Input
              id="policy-accrual-multiplier"
              value={accrualMultiplier}
              onChange={(event) => setAccrualMultiplier(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-consumption-multiplier">Consumption Multiplier</Label>
            <Input
              id="policy-consumption-multiplier"
              value={consumptionMultiplier}
              onChange={(event) => setConsumptionMultiplier(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="policy-carryover-cap">Carryover Cap (Days)</Label>
            <Input
              id="policy-carryover-cap"
              value={carryoverCapDays}
              onChange={(event) => setCarryoverCapDays(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accrual-simulation-months">Simulation Months</Label>
            <Input
              id="accrual-simulation-months"
              type="number"
              min={1}
              max={24}
              value={simulationMonths}
              onChange={(event) => setSimulationMonths(event.target.value)}
            />
          </div>
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">Safety</p>
            <p className="mt-1 text-muted-foreground">Simulation RPCs are read-only and do not mutate balances.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Policy Delta Days</p>
            <p className="mt-1 text-2xl font-semibold">
              {latestPolicySimulation?.delta_total_days.toFixed(2) ?? '-'}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Policy Delta Amount</p>
            <p className="mt-1 text-2xl font-semibold">
              {latestPolicySimulation
                ? `${latestPolicySimulation.delta_total_amount.toFixed(2)} ${latestPolicySimulation.currency_code}`
                : '-'}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Accrual Delta Units</p>
            <p className="mt-1 text-2xl font-semibold">
              {latestAccrualSimulation?.delta_total_units.toFixed(2) ?? '-'}
            </p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Impacted Employees</p>
            <p className="mt-1 text-2xl font-semibold">
              {latestAccrualSimulation?.employees ?? latestPolicySimulation?.employees ?? '-'}
            </p>
          </div>
        </div>
      </SurfaceSection>
    </div>
  );
}
