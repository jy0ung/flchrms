import { useCallback, useMemo, useState } from 'react';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import type { LeaveDisplayPrefs } from '@/hooks/useLeaveDisplayConfig';
import { ModalScaffold } from '@/components/system';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export interface LeaveDisplayCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balances: LeaveBalance[];
  currentPrefs: LeaveDisplayPrefs;
  onSave: (prefs: LeaveDisplayPrefs) => void;
  onReset: () => void;
}

export function LeaveDisplayCustomizeDialog({
  open,
  onOpenChange,
  balances,
  currentPrefs,
  onSave,
  onReset,
}: LeaveDisplayCustomizeDialogProps) {
  // Draft state — only committed on Save
  const allIds = useMemo(() => balances.map((b) => b.leave_type_id), [balances]);
  const nameById = useMemo(
    () => new Map(balances.map((b) => [b.leave_type_id, b.leave_type_name])),
    [balances],
  );

  // Build ordered list: visible ones first (in stored order), then hidden ones
  const [draftVisible, setDraftVisible] = useState<string[]>([]);
  const [draftHidden, setDraftHidden] = useState<string[]>([]);;

  // Sync draft when dialog opens
  const initDraft = useCallback(() => {
    const visibleSet = new Set(currentPrefs.visibleIds);
    setDraftVisible([...currentPrefs.visibleIds]);
    setDraftHidden(allIds.filter((id: string) => !visibleSet.has(id)));
  }, [currentPrefs.visibleIds, allIds]);

  // Reset draft every time dialog opens
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) initDraft();
      onOpenChange(nextOpen);
    },
    [onOpenChange, initDraft],
  );

  // Also init on first render when already open
  useState(() => {
    if (open) initDraft();
  });

  const orderedItems = useMemo(() => {
    return [
      ...draftVisible.map((id) => ({ id, visible: true })),
      ...draftHidden.map((id) => ({ id, visible: false })),
    ];
  }, [draftVisible, draftHidden]);

  const toggleVisibility = useCallback((id: string, nowVisible: boolean) => {
    if (nowVisible) {
      // Move from hidden → end of visible
      setDraftHidden((prev: string[]) => prev.filter((x: string) => x !== id));
      setDraftVisible((prev: string[]) => [...prev, id]);
    } else {
      // Move from visible → end of hidden
      setDraftVisible((prev: string[]) => prev.filter((x: string) => x !== id));
      setDraftHidden((prev: string[]) => [...prev, id]);
    }
  }, []);

  const moveUp = useCallback((id: string) => {
    setDraftVisible((prev: string[]) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((id: string) => {
    setDraftVisible((prev: string[]) => {
      const idx = prev.indexOf(id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const handleSave = () => {
    onSave({ visibleIds: draftVisible });
    onOpenChange(false);
  };

  const handleReset = () => {
    onReset();
    onOpenChange(false);
  };

  return (
    <ModalScaffold
      open={open}
      onOpenChange={handleOpenChange}
      title="Customize Leave Display"
      description="Choose which leave types to show and their display order."
      maxWidth="md"
      showCloseButton
      body={
        <div className="space-y-1">
          {orderedItems.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No leave types available.
            </p>
          )}

          {orderedItems.map((item) => {
            const name = nameById.get(item.id) ?? 'Unknown';
            const isVisible = item.visible;
            const visibleIdx = isVisible ? draftVisible.indexOf(item.id) : -1;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <Switch
                  id={`leave-vis-${item.id}`}
                  checked={isVisible}
                  onCheckedChange={(checked: boolean) => toggleVisibility(item.id, !!checked)}
                  aria-label={`Toggle ${name}`}
                />
                <Label
                  htmlFor={`leave-vis-${item.id}`}
                  className="flex-1 cursor-pointer text-sm font-medium"
                >
                  {name}
                </Label>

                {isVisible && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={visibleIdx <= 0}
                      onClick={() => moveUp(item.id)}
                      aria-label={`Move ${name} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={visibleIdx >= draftVisible.length - 1}
                      onClick={() => moveDown(item.id)}
                      aria-label={`Move ${name} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to Default
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      }
    />
  );
}
