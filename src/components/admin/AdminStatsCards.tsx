import { Briefcase, Shield, UserCog, Users } from 'lucide-react';
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
}

type AdminStatsCardMeta = {
  id: AdminStatsCardId;
  label: string;
  description: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
};

function AdminStatsCardView({ item }: { item: AdminStatsCardMeta }) {
  const Icon = item.icon;
  return (
    <Card className="card-stat border-border/60 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-2xl font-bold sm:text-3xl">{item.value}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
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
}: AdminStatsCardsProps) {
  const cards: AdminStatsCardMeta[] = [
    {
      id: 'totalEmployees',
      label: ADMIN_STATS_CARD_LABELS.totalEmployees,
      description: 'Total active employee records visible to this admin scope.',
      value: stats.totalEmployees,
      icon: Users,
      iconClass: 'text-accent bg-accent/10',
    },
    {
      id: 'admins',
      label: ADMIN_STATS_CARD_LABELS.admins,
      description: 'Users currently assigned system admin role.',
      value: stats.admins,
      icon: Shield,
      iconClass: 'text-red-500 bg-red-500/10',
    },
    {
      id: 'hrUsers',
      label: ADMIN_STATS_CARD_LABELS.hrUsers,
      description: 'Users assigned HR operations role.',
      value: stats.hrUsers,
      icon: UserCog,
      iconClass: 'text-violet-500 bg-violet-500/10',
    },
    {
      id: 'managers',
      label: ADMIN_STATS_CARD_LABELS.managers,
      description: 'Users assigned manager-level approval responsibilities.',
      value: stats.managers,
      icon: Briefcase,
      iconClass: 'text-blue-500 bg-blue-500/10',
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
          <AdminStatsCardView key={item.id} item={item} />
        ))}
      </div>
    );
  }

  const editableItems = visibleCards
    .map((card) => ({
      id: card.id,
      title: card.label,
      description: card.description,
      icon: card.icon,
      view: <AdminStatsCardView item={card} />,
    }));

  return (
    <EditableCanvas
      mode={mode === 'customize' ? 'customize' : 'view'}
      items={editableItems}
      layoutState={layoutState}
      onLayoutStateChange={onLayoutStateChange}
      onHideItem={onHideCard as ((itemId: string) => void) | undefined}
      columns={EDITABLE_LAYOUT_COLUMNS}
      widthSteps={[3, 6, 12]}
      rowHeightClassName="xl:auto-rows-[126px]"
      ariaLabel="Admin statistics canvas"
    />
  );
}
