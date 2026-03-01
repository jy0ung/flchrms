import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QueryErrorStateProps {
  /** Human-readable label for what failed, e.g. "leave requests" */
  label?: string;
  /** Call to retry the failed query */
  onRetry?: () => void;
  className?: string;
}

/**
 * A consistent, accessible error state for failed data queries.
 *
 * Drop this into any page/section that uses TanStack Query and
 * conditionally render when `isError` is `true`.
 */
export function QueryErrorState({ label = 'data', onRetry, className }: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center ${className ?? ''}`}
    >
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
      <div>
        <p className="font-medium text-destructive">Failed to load {label}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Something went wrong. Please check your connection and try again.
        </p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 gap-1.5">
          <RefreshCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
}
