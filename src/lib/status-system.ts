export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusIconKey =
  | "clock"
  | "info"
  | "check"
  | "alert"
  | "x"
  | "shield"
  | "dot";

export interface StatusMeta {
  key: string;
  label: string;
  tone: StatusTone;
  iconKey?: StatusIconKey;
  ariaLabel?: string;
}

const STATUS_REGISTRY: Record<string, Omit<StatusMeta, "key">> = {
  draft: { label: "Draft", tone: "neutral", iconKey: "dot" },
  pending: { label: "Pending", tone: "warning", iconKey: "clock" },
  processing: { label: "Processing", tone: "info", iconKey: "clock" },
  approved: { label: "Approved", tone: "success", iconKey: "check" },
  completed: { label: "Completed", tone: "success", iconKey: "check" },
  active: { label: "Active", tone: "success", iconKey: "check" },
  inactive: { label: "Inactive", tone: "neutral", iconKey: "dot" },
  cancelled: { label: "Cancelled", tone: "neutral", iconKey: "x" },
  rejected: { label: "Rejected", tone: "danger", iconKey: "x" },
  paid: { label: "Paid", tone: "success", iconKey: "check" },
  unpaid: { label: "Unpaid", tone: "warning", iconKey: "alert" },
  read: { label: "Read", tone: "neutral", iconKey: "dot" },
  unread: { label: "Unread", tone: "info", iconKey: "info" },
  warning: { label: "Warning", tone: "warning", iconKey: "alert" },
  info: { label: "Info", tone: "info", iconKey: "info" },
  success: { label: "Success", tone: "success", iconKey: "check" },
  error: { label: "Error", tone: "danger", iconKey: "x" },
};

const STATUS_ALIASES: Record<string, string> = {
  in_progress: "processing",
  inprogress: "processing",
  open: "active",
  closed: "completed",
  failed: "error",
  terminated: "inactive",
  archived: "inactive",
  published: "active",
};

function humanizeStatusKey(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeStatusKey(status: string): string {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_ALIASES[normalized] ?? normalized;
}

export function getStatusMeta(status: string): StatusMeta {
  const key = normalizeStatusKey(status);
  const hit = STATUS_REGISTRY[key];
  if (hit) {
    return { key, ...hit };
  }

  return {
    key,
    label: humanizeStatusKey(key),
    tone: "neutral",
    iconKey: "dot",
  };
}

export function getStatusRegistrySnapshot(): Readonly<Record<string, Omit<StatusMeta, "key">>> {
  return STATUS_REGISTRY;
}
