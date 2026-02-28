import { Card, CardContent } from '@/components/ui/card';
import {
  EditableCanvas,
  type InteractionMode,
} from '@/components/system';
import {
  EDITABLE_LAYOUT_COLUMNS,
  buildLayoutStateFromOrder,
  type LayoutState,
} from '@/lib/editable-layout';

export interface AdminStats {
  totalEmployees: number;
  admins: number;
  hrUsers: number;
  managers: number;
}

export type AdminStatsCardId = 'totalEmployees' | 'admins' | 'hrUsers' | 'managers';

export const ADMIN_STATS_DEFAULT_CARD_IDS: AdminStatsCardId[] = [
  'totalEmployees',
  'admins',
  'hrUsers',
  'managers',
];

export const ADMIN_STATS_CARD_LABELS: Record<AdminStatsCardId, string> = {
  totalEmployees: 'Total Employees',
  admins: 'Admins',
  hrUsers: 'HR Users',
  managers: 'Managers',
};

export const ADMIN_STATS_CARD_DIMENSIONS: Record<AdminStatsCardId, { w: number; h: number }> = {
  totalEmployees: { w: 3, h: 1 },
  admins: { w: 3, h: 1 },
  hrUsers: { w: 3, h: 1 },
  managers: { w: 3, h: 1 },
};

export function getAdminStatsDefaultLayoutState(
  orderedIds: readonly AdminStatsCardId[] = ADMIN_STATS_DEFAULT_CARD_IDS,
): LayoutState {
  const dims = Object.fromEntries(
    orderedIds.map((id) => [id, ADMIN_STATS_CARD_DIMENSIONS[id]]),
  ) as Record<AdminStatsCardId, { w: number; h: number }>;

  return buildLayoutStateFromOrder(
    [...orderedIds],
    dims,
    EDITABLE_LAYOUT_COLUMNS,
  );
}

interface AdminStatsCardsProps {
  stats: AdminStats;
  mode?: InteractionMode;
  visibleCardIds?: AdminStatsCardId[];
  layoutState?: LayoutState;
  onLayoutStateChange?: (nextState: LayoutState) => void;
  onHideCard?: (cardId: AdminStatsCardId) => void;
  density?: 'default' | 'compact';
}

type AdminStatsCardMeta = {
  id: AdminStatsCardId;
  label: string;
  description: string;
  meta: string;
  value: number;
};

function AdminStatsCardView({
  item,
  density = 'default',
}: {
  item: AdminStatsCardMeta;
  density?: 'default' | 'compact';
}) {
  return (
    <Card className="card-stat border-border/60 shadow-sm">
      <CardContent className={density === 'compact' ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.label}
        </p>
        <p className={density === 'compact' ? 'mt-1 text-xl font-bold sm:text-2xl' : 'mt-1 text-2xl font-bold'}>{item.value}</p>
        {density === 'compact' ? (
          <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminStatsCards({
  stats,
  mode = 'view',
  visibleCardIds = ADMIN_STATS_DEFAULT_CARD_IDS,
  layoutState,
  onLayoutStateChange,
  onHideCard,
  density = 'default',
}: AdminStatsCardsProps) {
  const cards: AdminStatsCardMeta[] = [
    {
      id: 'totalEmployees',
      label: ADMIN_STATS_CARD_LABELS.totalEmployees,
      description: 'Total active employee records visible to this admin scope.',
      meta: 'Active records in scope',
      value: stats.totalEmployees,
    },
    {
      id: 'admins',
      label: ADMIN_STATS_CARD_LABELS.admins,
      description: 'Users currently assigned system admin role.',
      meta: 'System administration accounts',
      value: stats.admins,
    },
    {
      id: 'hrUsers',
      label: ADMIN_STATS_CARD_LABELS.hrUsers,
      description: 'Users assigned HR operations role.',
      meta: 'HR operations accounts',
      value: stats.hrUsers,
    },
    {
      id: 'managers',
      label: ADMIN_STATS_CARD_LABELS.managers,
      description: 'Users assigned manager-level approval responsibilities.',
      meta: 'Approval managers in scope',
      value: stats.managers,
    },
  ];

  const cardById = new Map(cards.map((card) => [card.id, card]));
  const visibleCards = visibleCardIds
    .map((cardId) => cardById.get(cardId))
    .filter((card): card is AdminStatsCardMeta => Boolean(card));

  if (!layoutState || !onLayoutStateChange) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visibleCards.map((item) => (
          <AdminStatsCardView key={item.id} item={item} density={density} />
        ))}
      </div>
    );
  }

  const editableItems = visibleCards
    .map((card) => ({
      id: card.id,
      title: card.label,
      description: density === 'compact' ? card.meta : card.description,
      view: <AdminStatsCardView item={card} density={density} />,
    }));

  const resizeRulesById = Object.fromEntries(
    visibleCards.map((card) => [
      card.id,
      { minW: 3, maxW: 12, step: 1 },
    ]),
  );

  return (
    <EditableCanvas
      mode={mode === 'customize' ? 'customize' : 'view'}
      variant="enterprise"
      items={editableItems}
      layoutState={layoutState}
      onLayoutStateChange={onLayoutStateChange}
      onHideItem={onHideCard as ((itemId: string) => void) | undefined}
      resizeRulesById={resizeRulesById}
      enableKeyboardResize
      columns={EDITABLE_LAYOUT_COLUMNS}
      widthSteps={[3, 6, 12]}
      rowHeightClassName="xl:auto-rows-[126px]"
      ariaLabel="Admin statistics canvas"
    />
  );
}
