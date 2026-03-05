import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { SurfaceSection } from '@/components/system/SurfaceSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEmployees } from '@/hooks/useEmployees';
import {
  useCreateLeaveDelegation,
  useDeleteLeaveDelegation,
  useLeaveDelegations,
  useUpdateLeaveDelegationStatus,
} from '@/hooks/useLeaveDelegations';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeErrorMessage } from '@/lib/error-utils';

type DelegationScope = 'leave_approval' | 'leave_cancellation' | 'full';

function toLocalDateTimeInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function scopeLabel(scope: DelegationScope) {
  switch (scope) {
    case 'leave_approval':
      return 'Leave Approval';
    case 'leave_cancellation':
      return 'Leave Cancellation';
    case 'full':
      return 'Full';
    default:
      return scope;
  }
}

export function LeaveDelegationsSection() {
  const { user } = useAuth();
  const { data: delegations, isLoading, isError, error } = useLeaveDelegations();
  const { data: employees } = useEmployees();
  const createDelegation = useCreateLeaveDelegation();
  const updateStatus = useUpdateLeaveDelegationStatus();
  const deleteDelegation = useDeleteLeaveDelegation();

  const [delegateUserId, setDelegateUserId] = useState('');
  const [scope, setScope] = useState<DelegationScope>('leave_approval');
  const [validFrom, setValidFrom] = useState(() => toLocalDateTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [validTo, setValidTo] = useState(() => toLocalDateTimeInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const candidateEmployees = useMemo(() => {
    return (employees ?? [])
      .filter((employee) => employee.id !== user?.id)
      .map((employee) => ({
        id: employee.id,
        label: `${employee.first_name} ${employee.last_name} (${employee.email})`,
      }));
  }, [employees, user?.id]);

  const handleCreateDelegation = async () => {
    setFormError(null);

    if (!delegateUserId) {
      setFormError('Please select a delegate.');
      return;
    }

    if (!validFrom || !validTo) {
      setFormError('Please provide valid delegation window dates.');
      return;
    }

    const validFromIso = new Date(validFrom).toISOString();
    const validToIso = new Date(validTo).toISOString();

    if (new Date(validToIso) <= new Date(validFromIso)) {
      setFormError('Valid to date must be after valid from date.');
      return;
    }

    try {
      await createDelegation.mutateAsync({
        delegateUserId,
        scope,
        validFrom: validFromIso,
        validTo: validToIso,
        reason: reason.trim() || undefined,
      });

      setReason('');
    } catch (createError) {
      setFormError(sanitizeErrorMessage(createError as Error));
    }
  };

  return (
    <SurfaceSection
      title="Approval Delegations"
      description="Delegate leave approval and cancellation responsibilities within a time window."
      className="mt-4"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="leave-delegate-user">Delegate User</Label>
            <Select value={delegateUserId} onValueChange={setDelegateUserId}>
              <SelectTrigger id="leave-delegate-user">
                <SelectValue placeholder="Select delegate" />
              </SelectTrigger>
              <SelectContent>
                {candidateEmployees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leave-delegate-scope">Scope</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as DelegationScope)}>
              <SelectTrigger id="leave-delegate-scope">
                <SelectValue placeholder="Select scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leave_approval">Leave Approval</SelectItem>
                <SelectItem value="leave_cancellation">Leave Cancellation</SelectItem>
                <SelectItem value="full">Full</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leave-delegate-valid-from">Valid From</Label>
            <Input
              id="leave-delegate-valid-from"
              type="datetime-local"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leave-delegate-valid-to">Valid To</Label>
            <Input
              id="leave-delegate-valid-to"
              type="datetime-local"
              value={validTo}
              onChange={(event) => setValidTo(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="leave-delegate-reason">Reason (Optional)</Label>
          <Textarea
            id="leave-delegate-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for delegation window"
            rows={2}
          />
        </div>

        {formError ? (
          <p className="text-xs text-destructive">{formError}</p>
        ) : null}

        <Button type="button" onClick={() => void handleCreateDelegation()} disabled={createDelegation.isPending}>
          {createDelegation.isPending ? 'Creating…' : 'Create Delegation'}
        </Button>

        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium mb-2">Existing Delegations</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading delegations…</p>
          ) : isError ? (
            <p className="text-sm text-destructive">{sanitizeErrorMessage(error as Error)}</p>
          ) : delegations && delegations.length > 0 ? (
            <div className="space-y-2">
              {delegations.map((delegation) => (
                <div
                  key={delegation.id}
                  className="flex flex-col gap-2 rounded-md border border-border p-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{scopeLabel(delegation.scope as DelegationScope)}</Badge>
                      <Badge variant={delegation.status === 'active' ? 'default' : 'secondary'}>
                        {delegation.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(delegation.valid_from), 'PPp')} to{' '}
                      {format(new Date(delegation.valid_to), 'PPp')}
                    </p>
                    {delegation.reason ? (
                      <p className="text-xs text-muted-foreground">{delegation.reason}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground/80 font-mono">
                      Delegate ID: {delegation.delegate_user_id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {delegation.status === 'active' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() =>
                          updateStatus.mutate({
                            delegationId: delegation.id,
                            status: 'revoked',
                          })
                        }
                      >
                        Revoke
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleteDelegation.isPending}
                      onClick={() => deleteDelegation.mutate(delegation.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No delegations configured.</p>
          )}
        </div>
      </div>
    </SurfaceSection>
  );
}
