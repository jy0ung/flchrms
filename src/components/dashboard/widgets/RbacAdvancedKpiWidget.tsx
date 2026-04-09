/**
 * RBAC Advanced KPI Widget
 * 
 * Displays role distribution, capability utilization, and RBAC health metrics.
 * Complements executiveMetrics widget by focusing on governance structure rather
 * than workforce statistics.
 */
import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRbacAnalytics, type RoleDistribution, type RbacHealthIndicator } from '@/hooks/useRbacAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const statusIconMap = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: AlertCircle,
};

const statusColorMap = {
  healthy: 'text-success',
  warning: 'text-warning',
  critical: 'text-destructive',
};

const statusBgMap = {
  healthy: 'bg-success/10 border-success/20',
  warning: 'bg-warning/10 border-warning/20',
  critical: 'bg-destructive/10 border-destructive/20',
};

interface RbacAdvancedKpiWidgetProps {
  compact?: boolean;
}

function RoleDistributionMini({ roles }: { roles: RoleDistribution[] }) {
  if (roles.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No role data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {roles.map((r) => (
        <div key={r.role} className="flex items-center gap-2">
          <div className="min-w-24 text-xs font-medium text-foreground/80 capitalize">
            {r.role}
          </div>
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/70 rounded-full transition-all"
                style={{ width: `${r.percentage}%` }}
              />
            </div>
            <div className="w-12 text-right text-xs font-semibold text-foreground">
              {r.count}
              <span className="text-muted-foreground ml-1">({r.percentage}%)</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HealthIndicators({ indicators }: { indicators: RbacHealthIndicator[] }) {
  if (indicators.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        No health data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {indicators.map((indicator) => {
        const StatusIcon = statusIconMap[indicator.status];
        
        return (
          <div
            key={indicator.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              statusBgMap[indicator.status],
            )}
          >
            <StatusIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', statusColorMap[indicator.status])} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                {indicator.label}
                {indicator.value && <span className="ml-2 font-bold">{indicator.value}</span>}
              </p>
              <p className="text-xs text-foreground/70 mt-0.5">{indicator.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="flex-1 h-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function HealthLoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function RbacAdvancedKpiWidget({ compact = false }: RbacAdvancedKpiWidgetProps) {
  const { roleDistribution, rbacHealth, isLoading } = useRbacAnalytics();

  const healthSummary = useMemo(() => {
    const criticalCount = rbacHealth.filter(h => h.status === 'critical').length;
    const warningCount = rbacHealth.filter(h => h.status === 'warning').length;
    
    if (criticalCount > 0) {
      return { status: 'critical' as const, message: `${criticalCount} critical issue(s)` };
    }
    if (warningCount > 0) {
      return { status: 'warning' as const, message: `${warningCount} warning(s)` };
    }
    return { status: 'healthy' as const, message: 'All systems healthy' };
  }, [rbacHealth]);

  if (compact) {
    // Compact version shows only health summary
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            RBAC Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className={cn(
              'p-3 rounded-lg border text-center',
              healthSummary.status === 'healthy' && 'bg-success/10 border-success/20 text-success',
              healthSummary.status === 'warning' && 'bg-warning/10 border-warning/20 text-warning',
              healthSummary.status === 'critical' && 'bg-destructive/10 border-destructive/20 text-destructive',
            )}>
              <p className="text-sm font-semibold">{healthSummary.message}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full widget shows role distribution + health indicators
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              RBAC Advanced KPI
            </CardTitle>
            <CardDescription>
              Role distribution and governance health status
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn(
            'capitalize',
            healthSummary.status === 'healthy' && 'border-success/50 bg-success/10 text-success',
            healthSummary.status === 'warning' && 'border-warning/50 bg-warning/10 text-warning',
            healthSummary.status === 'critical' && 'border-destructive/50 bg-destructive/10 text-destructive',
          )}>
            {healthSummary.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Role Distribution Section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Role Distribution</h4>
          {isLoading ? (
            <RoleLoadingSkeleton />
          ) : (
            <RoleDistributionMini roles={roleDistribution} />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Health Indicators Section */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">Governance Health</h4>
          {isLoading ? (
            <HealthLoadingSkeleton />
          ) : (
            <HealthIndicators indicators={rbacHealth} />
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium">Total Roles</p>
            <p className="text-lg font-bold mt-1">{roleDistribution.length}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground font-medium">Health Issues</p>
            <p className="text-lg font-bold mt-1">
              {rbacHealth.filter(h => h.status !== 'healthy').length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
