export const INTERACTION_MODES = ["view", "edit", "bulk", "manage", "customize"] as const;

export type InteractionMode = (typeof INTERACTION_MODES)[number];

export const DEFAULT_INTERACTION_MODE: InteractionMode = "view";

export const INTERACTION_MODE_LABELS: Record<InteractionMode, string> = {
  view: "View",
  edit: "Edit",
  bulk: "Bulk",
  manage: "Manage",
  customize: "Customize",
};

export function isInteractionMode(value: string): value is InteractionMode {
  return (INTERACTION_MODES as readonly string[]).includes(value);
}

export function normalizeInteractionModes(modes?: readonly InteractionMode[]): InteractionMode[] {
  if (!modes || modes.length === 0) return [...INTERACTION_MODES];
  const next = new Set<InteractionMode>(["view"]);
  for (const mode of modes) {
    next.add(mode);
  }
  return Array.from(next);
}

