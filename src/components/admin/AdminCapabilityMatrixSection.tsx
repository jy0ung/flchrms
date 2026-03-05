import { useMemo, useState } from 'react';
import { Loader2, Lock, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminCapabilityMatrix, useSetAdminRoleCapability, buildDefaultCapabilityMatrixRows } from '@/hooks/admin/useAdminCapabilities';
import {
  APP_ROLE_ORDER,
  ADMIN_CAPABILITY_KEYS,
  ADMIN_CAPABILITY_META,
  getDefaultAdminCapabilityMap,
  isAdminCapabilityLocked,
  type AdminCapabilityKey,
} from '@/lib/admin-capabilities';
import type { AppRole } from '@/types/hrms';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

type DraftMap = Record<string, boolean>;

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  hr: 'HR',
  director: 'Director',
  general_manager: 'General Manager',
  manager: 'Manager',
  employee: 'Employee',
};

function keyOf(role: AppRole, capability: AdminCapabilityKey) {
  return `${role}::${capability}`;
}

export function AdminCapabilityMatrixSection() {
  const { role } = useAuth();
  const canEdit = role === 'admin';
  const [draft, setDraft] = useState<DraftMap>({});
  const [reason, setReason] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [resettingRole, setResettingRole] = useState<AppRole | null>(null);
  const matrixQuery = useAdminCapabilityMatrix(role);
  const setCapability = useSetAdminRoleCapability();

  const fallbackRows = useMemo(() => buildDefaultCapabilityMatrixRows(), []);

  const rows = useMemo(() => {
    if (matrixQuery.data && matrixQuery.data.length > 0) {
      return matrixQuery.data;
    }
    return fallbackRows;
  }, [fallbackRows, matrixQuery.data]);

  const matrixByKey = useMemo(() => {
    const map = new Map<string, (typeof rows)[number]>();
    for (const rowEntry of rows) {
      map.set(keyOf(rowEntry.role, rowEntry.capability), rowEntry);
    }
    return map;
  }, [rows]);

  const pendingEntries = Object.entries(draft);
  const pendingCount = pendingEntries.length;
  const hasLiveOverrides = !!matrixQuery.data && !matrixQuery.error;

  const getEffectiveValue = (targetRole: AppRole, capability: AdminCapabilityKey) => {
    const key = keyOf(targetRole, capability);
    if (key in draft) {
      return draft[key];
    }
    return matrixByKey.get(key)?.enabled ?? getDefaultAdminCapabilityMap(targetRole)[capability];
  };

  const setDraftValue = (targetRole: AppRole, capability: AdminCapabilityKey, enabled: boolean) => {
    const key = keyOf(targetRole, capability);
    const baseEnabled =
      matrixByKey.get(key)?.enabled ?? getDefaultAdminCapabilityMap(targetRole)[capability];

    setDraft((previous) => {
      const nextDraft = { ...previous };
      if (enabled === baseEnabled) {
        delete nextDraft[key];
      } else {
        nextDraft[key] = enabled;
      }
      return nextDraft;
    });
  };

  const removeDraftForKey = (key: string) => {
    setDraft((previous) => {
      if (!(key in previous)) return previous;
      const nextDraft = { ...previous };
      delete nextDraft[key];
      return nextDraft;
    });
  };

  const clearDraft = () => setDraft({});

  const saveCell = async (targetRole: AppRole, capability: AdminCapabilityKey) => {
    const key = keyOf(targetRole, capability);
    if (!(key in draft)) return;
    const enabled = draft[key];

    setSavingKey(key);
    try {
      await setCapability.mutateAsync({
        role: targetRole,
        capability,
        enabled,
        reason: reason.trim() || null,
      });
      removeDraftForKey(key);
      toast.success('Capability updated');
    } catch {
      // Mutation hook already emits sanitized error toast.
      return;
    } finally {
      setSavingKey(null);
    }
  };

  const saveAll = async () => {
    if (pendingEntries.length === 0) return;

    setSavingKey('bulk');
    try {
      for (const [entryKey, enabled] of pendingEntries) {
        const [targetRole, capability] = entryKey.split('::') as [AppRole, AdminCapabilityKey];
        await setCapability.mutateAsync({
          role: targetRole,
          capability,
          enabled,
          reason: reason.trim() || null,
        });
      }
      clearDraft();
      toast.success('Capability overrides saved');
    } catch {
      return;
    } finally {
      setSavingKey(null);
    }
  };

  const resetRoleToDefaults = async (targetRole: AppRole) => {
    const defaultMap = getDefaultAdminCapabilityMap(targetRole);
    const entries = ADMIN_CAPABILITY_KEYS.filter((capability) => {
      const current = matrixByKey.get(keyOf(targetRole, capability))?.enabled ?? defaultMap[capability];
      return current !== defaultMap[capability];
    });

    if (entries.length === 0) {
      toast.info(`${roleLabels[targetRole]} is already on defaults.`);
      setDraft((previous) => {
        const nextDraft = { ...previous };
        for (const capability of ADMIN_CAPABILITY_KEYS) {
          delete nextDraft[keyOf(targetRole, capability)];
        }
        return nextDraft;
      });
      return;
    }

    setResettingRole(targetRole);
    try {
      for (const capability of entries) {
        await setCapability.mutateAsync({
          role: targetRole,
          capability,
          enabled: defaultMap[capability],
          reason: reason.trim() || `Reset ${targetRole} capability defaults`,
        });
      }
      setDraft((previous) => {
        const nextDraft = { ...previous };
        for (const capability of ADMIN_CAPABILITY_KEYS) {
          delete nextDraft[keyOf(targetRole, capability)];
        }
        return nextDraft;
      });
      toast.success(`${roleLabels[targetRole]} reset to defaults.`);
    } catch {
      return;
    } finally {
      setResettingRole(null);
    }
  };

  if (matrixQuery.isLoading && !matrixQuery.data) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading capability matrix...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Admin Capability Matrix</CardTitle>
        <CardDescription>
          Configure admin-module capabilities by role. Only admin users can modify overrides.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasLiveOverrides && (
          <Alert>
            <AlertDescription>
              Showing default capability matrix. Live override data is only available to admin.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              Pending changes: <span className="font-medium text-foreground">{pendingCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pendingCount === 0 || savingKey !== null || !canEdit}
                onClick={clearDraft}
              >
                Discard
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pendingCount === 0 || savingKey !== null || !canEdit}
                onClick={() => void saveAll()}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save All
              </Button>
            </div>
          </div>
          <Input
            placeholder="Reason for capability change (audit trail)"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={!canEdit || savingKey !== null}
          />
        </div>

        <div className="rounded-lg border">
          <div className="overflow-x-auto">
            <Table className="min-w-[1700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Role</TableHead>
                  {ADMIN_CAPABILITY_KEYS.map((capability) => (
                    <TableHead key={capability} className="min-w-[185px] align-top">
                      <div className="space-y-1">
                        <p className="font-semibold normal-case tracking-normal text-foreground">
                          {ADMIN_CAPABILITY_META[capability].label}
                        </p>
                        <p className="text-[11px] normal-case tracking-normal text-muted-foreground">
                          {ADMIN_CAPABILITY_META[capability].description}
                        </p>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="w-[140px]">Role Defaults</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {APP_ROLE_ORDER.map((targetRole) => (
                  <TableRow key={targetRole}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{roleLabels[targetRole]}</p>
                        <p className="text-xs text-muted-foreground">{targetRole}</p>
                      </div>
                    </TableCell>

                    {ADMIN_CAPABILITY_KEYS.map((capability) => {
                      const key = keyOf(targetRole, capability);
                      const baseEnabled =
                        matrixByKey.get(key)?.enabled ?? getDefaultAdminCapabilityMap(targetRole)[capability];
                      const currentEnabled = getEffectiveValue(targetRole, capability);
                      const changed = key in draft;
                      const locked = isAdminCapabilityLocked(targetRole, capability);
                      const saving = savingKey === key || savingKey === 'bulk';

                      return (
                        <TableCell key={key}>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={currentEnabled}
                              onCheckedChange={(nextValue) =>
                                setDraftValue(targetRole, capability, nextValue)
                              }
                              disabled={!canEdit || locked || saving}
                            />
                            {locked && (
                              <Badge variant="outline" className="gap-1 px-1.5 py-0.5">
                                <Lock className="h-3 w-3" />
                                Lock
                              </Badge>
                            )}
                            {changed && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={!canEdit || saving}
                                onClick={() => void saveCell(targetRole, capability)}
                                aria-label={`Save ${targetRole} ${capability}`}
                              >
                                {savingKey === key ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            {currentEnabled ? 'Enabled' : 'Disabled'}
                            {baseEnabled !== currentEnabled ? ' (override)' : ''}
                          </div>
                        </TableCell>
                      );
                    })}

                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={!canEdit || savingKey !== null || resettingRole === targetRole}
                        onClick={() => void resetRoleToDefaults(targetRole)}
                      >
                        {resettingRole === targetRole ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
