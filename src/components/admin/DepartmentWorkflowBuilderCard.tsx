import { RotateCcw, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { Department, LeaveApprovalStage } from '@/types/hrms';
import { LEAVE_APPROVAL_STAGE_LABELS, LEAVE_APPROVAL_STAGE_OPTIONS } from '@/lib/leave-workflow';

type WorkflowDraft = {
  approval_stages: LeaveApprovalStage[];
  is_active: boolean;
  notes: string;
};

interface DepartmentWorkflowBuilderCardProps {
  title: string;
  description: string;
  loading: boolean;
  onResetDefaults: () => void;
  resetDefaultsPending: boolean;
  resetDefaultsIdleLabel?: string;
  resetDefaultsPendingLabel?: string;
  departmentScopeSelectId: string;
  departmentScope: string;
  onDepartmentScopeChange: (scope: string) => void;
  globalScopeValue: string;
  departments?: Department[];
  scopeHelpText: string;
  routeTitle: string;
  scopeLabel: string;
  routePreview: string;
  draft: WorkflowDraft;
  activeSwitchId: string;
  onActiveChange: (checked: boolean) => void;
  onToggleStage: (stage: LeaveApprovalStage) => void;
  notesInputId: string;
  onNotesChange: (value: string) => void;
  notesPlaceholder: string;
  onResetRoute: () => void;
  onSaveProfile: () => void;
  savePending: boolean;
  saveIdleLabel?: string;
  savePendingLabel?: string;
}

export function DepartmentWorkflowBuilderCard({
  title,
  description,
  loading,
  onResetDefaults,
  resetDefaultsPending,
  resetDefaultsIdleLabel = 'Reset Defaults',
  resetDefaultsPendingLabel = 'Resetting...',
  departmentScopeSelectId,
  departmentScope,
  onDepartmentScopeChange,
  globalScopeValue,
  departments,
  scopeHelpText,
  routeTitle,
  scopeLabel,
  routePreview,
  draft,
  activeSwitchId,
  onActiveChange,
  onToggleStage,
  notesInputId,
  onNotesChange,
  notesPlaceholder,
  onResetRoute,
  onSaveProfile,
  savePending,
  saveIdleLabel = 'Save Profile',
  savePendingLabel = 'Saving...',
}: DepartmentWorkflowBuilderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onResetDefaults}
            disabled={resetDefaultsPending}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {resetDefaultsPending ? resetDefaultsPendingLabel : resetDefaultsIdleLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={`${departmentScopeSelectId}-skeleton-${i}`} className="h-20 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor={departmentScopeSelectId}>Department Scope</Label>
                <Select
                  value={departmentScope}
                  onValueChange={onDepartmentScopeChange}
                >
                  <SelectTrigger id={departmentScopeSelectId}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={globalScopeValue}>All Departments (Default)</SelectItem>
                    {departments?.map((department) => (
                      <SelectItem key={`${departmentScopeSelectId}-${department.id}`} value={department.id}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{scopeHelpText}</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium">{routeTitle}</p>
                  <p className="text-xs text-muted-foreground">Scope: {scopeLabel}</p>
                  <p className="text-xs text-muted-foreground">Current route profile: {routePreview}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={activeSwitchId} className="text-sm">Active</Label>
                  <Switch
                    id={activeSwitchId}
                    checked={draft.is_active}
                    onCheckedChange={onActiveChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {LEAVE_APPROVAL_STAGE_OPTIONS.map((stage) => {
                  const enabled = draft.approval_stages.includes(stage);
                  const isFinalStage = draft.approval_stages[draft.approval_stages.length - 1] === stage;

                  return (
                    <div key={`${activeSwitchId}-${stage}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{LEAVE_APPROVAL_STAGE_LABELS[stage]}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isFinalStage ? 'Current final stage' : 'Optional'}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => onToggleStage(stage)}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor={notesInputId}>Notes (Optional)</Label>
                <Input
                  id={notesInputId}
                  value={draft.notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder={notesPlaceholder}
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={onResetRoute}>
                  Reset Route
                </Button>
                <Button type="button" onClick={onSaveProfile} disabled={savePending}>
                  {savePending ? savePendingLabel : saveIdleLabel}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
