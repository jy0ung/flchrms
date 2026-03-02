import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CardHeaderStandard } from '@/components/system';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GripVertical, Save, RotateCcw } from 'lucide-react';
import {
  useLeaveDisplayConfig,
  useSaveLeaveDisplayConfig,
} from '@/hooks/useLeaveDisplayConfig';
import type { LeaveType } from '@/types/hrms';

interface LeaveDisplayConfigSectionProps {
  leaveTypes: LeaveType[];
  canManage: boolean;
}

interface ConfigRow {
  leave_type_id: string;
  leave_type_name: string;
  display_order: number;
  is_visible: boolean;
  category: 'primary' | 'secondary';
}

export function LeaveDisplayConfigSection({
  leaveTypes,
  canManage,
}: LeaveDisplayConfigSectionProps) {
  const { data: existingConfig, isLoading } = useLeaveDisplayConfig();
  const saveMutation = useSaveLeaveDisplayConfig();

  const initialRows = useMemo((): ConfigRow[] => {
    const configMap = new Map(
      (existingConfig ?? []).map((c) => [c.leave_type_id, c] as const),
    );

    return leaveTypes
      .map((lt, index): ConfigRow => {
        const existing = configMap.get(lt.id);
        return {
          leave_type_id: lt.id,
          leave_type_name: lt.name,
          display_order: existing?.display_order ?? index,
          is_visible: existing?.is_visible ?? true,
          category: (existing?.category as 'primary' | 'secondary') ?? 'primary',
        };
      })
      .sort((a, b) => a.display_order - b.display_order);
  }, [leaveTypes, existingConfig]);

  const [rows, setRows] = useState<ConfigRow[]>(initialRows);

  // Sync when initial data changes (e.g. after save or when existingConfig loads)
  const [lastInitial, setLastInitial] = useState(initialRows);
  if (initialRows !== lastInitial) {
    setLastInitial(initialRows);
    setRows(initialRows);
  }

  const isDirty = useMemo(() => {
    return JSON.stringify(rows) !== JSON.stringify(initialRows);
  }, [rows, initialRows]);

  const moveRow = useCallback((index: number, direction: 'up' | 'down') => {
    setRows((prev) => {
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next.map((r, i) => ({ ...r, display_order: i }));
    });
  }, []);

  const toggleVisibility = useCallback((index: number) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, is_visible: !r.is_visible } : r,
      ),
    );
  }, []);

  const setCategory = useCallback(
    (index: number, category: 'primary' | 'secondary') => {
      setRows((prev) =>
        prev.map((r, i) => (i === index ? { ...r, category } : r)),
      );
    },
    [],
  );

  const handleSave = () => {
    saveMutation.mutate(
      rows.map((r) => ({
        leave_type_id: r.leave_type_id,
        display_order: r.display_order,
        is_visible: r.is_visible,
        category: r.category,
      })),
    );
  };

  const handleReset = () => {
    setRows(initialRows);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading display configuration…
      </div>
    );
  }

  return (
    <Card>
      <CardHeaderStandard
        title="Dashboard Display Order"
        description="Control which leave types appear on the employee Leave Dashboard and their display order. Types marked as 'Primary' appear in the top row; 'Secondary' types appear in a collapsible section below."
      />
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div
              key={row.leave_type_id}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                !row.is_visible ? 'bg-muted/50 opacity-60' : ''
              }`}
            >
              {canManage && (
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === 0}
                    onClick={() => moveRow(index, 'up')}
                    aria-label={`Move ${row.leave_type_name} up`}
                  >
                    ▲
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    disabled={index === rows.length - 1}
                    onClick={() => moveRow(index, 'down')}
                    aria-label={`Move ${row.leave_type_name} down`}
                  >
                    ▼
                  </Button>
                </div>
              )}

              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">
                  {row.leave_type_name}
                </span>
              </div>

              <Select
                value={row.category}
                onValueChange={(value) =>
                  setCategory(index, value as 'primary' | 'secondary')
                }
                disabled={!canManage}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {row.is_visible ? 'Visible' : 'Hidden'}
                </span>
                <Switch
                  checked={row.is_visible}
                  onCheckedChange={() => toggleVisibility(index)}
                  disabled={!canManage}
                  aria-label={`Toggle visibility for ${row.leave_type_name}`}
                />
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No leave types found. Create leave types first in the Leave Policies
            tab.
          </p>
        )}

        {canManage && (
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!isDirty}
              onClick={handleReset}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saveMutation.isPending}
              onClick={handleSave}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saveMutation.isPending ? 'Saving…' : 'Save Configuration'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
