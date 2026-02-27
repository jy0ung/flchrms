import * as React from 'react';

import { EditableCanvas, type EditableCanvasItem } from '@/components/system/EditableCanvas';
import { type InteractionMode } from '@/components/system/interaction-mode';
import { type LayoutState } from '@/lib/editable-layout';
import { type DashboardTier } from '@/lib/dashboard-layout';
import { cn } from '@/lib/utils';

interface ResizeRule {
  minW: number;
  maxW: number;
  step: number;
}

export interface DashboardLaneProps {
  tier: DashboardTier;
  mode: InteractionMode;
  items: EditableCanvasItem[];
  layoutState: LayoutState;
  onLayoutStateChange: (nextState: LayoutState) => void;
  onHideItem?: (itemId: string) => void;
  resizeRulesById?: Record<string, ResizeRule>;
  className?: string;
}

const TIER_LABELS: Record<DashboardTier, string> = {
  primary: 'Primary Widgets',
  secondary: 'Secondary Widgets',
  supporting: 'Supporting Widgets',
};

export function DashboardLane({
  tier,
  mode,
  items,
  layoutState,
  onLayoutStateChange,
  onHideItem,
  resizeRulesById,
  className,
}: DashboardLaneProps) {
  const isCustomize = mode === 'customize';
  const headingId = `dashboard-lane-${tier}-heading`;

  if (items.length === 0 && !isCustomize) {
    return null;
  }

  return (
    <section
      role="region"
      aria-label={`${TIER_LABELS[tier]} dashboard widgets`}
      aria-labelledby={isCustomize ? headingId : undefined}
      className={cn('space-y-3', className)}
    >
      {isCustomize ? (
        <h2 id={headingId} className="text-sm font-semibold tracking-wide text-muted-foreground">
          {TIER_LABELS[tier]}
        </h2>
      ) : null}

      {items.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-sm text-muted-foreground"
          aria-label={`${TIER_LABELS[tier]} lane is empty`}
        >
          No widgets available in this lane for your role.
        </div>
      ) : (
        <EditableCanvas
          mode={mode}
          variant={isCustomize ? 'enterprise' : 'legacy'}
          items={items}
          layoutState={layoutState}
          onLayoutStateChange={onLayoutStateChange}
          onHideItem={onHideItem}
          resizeRulesById={resizeRulesById}
          enableKeyboardResize={isCustomize}
          columns={12}
          rowHeightClassName="xl:auto-rows-[92px]"
          ariaLabel={`${TIER_LABELS[tier]} canvas`}
        />
      )}
    </section>
  );
}
