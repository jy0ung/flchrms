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
  low: { label: "Low", tone: "neutral", iconKey: "dot" },
  normal: { label: "Normal", tone: "info", iconKey: "info" },
  high: { label: "High", tone: "warning", iconKey: "alert" },
  urgent: { label: "Urgent", tone: "danger", iconKey: "alert" },
  draft: { label: "Draft", tone: "neutral", iconKey: "dot" },
  pending: { label: "Pending", tone: "warning", iconKey: "clock" },
  processing: { label: "Processing", tone: "info", iconKey: "clock" },
  running: { label: "Running", tone: "info", iconKey: "clock" },
  approved: { label: "Approved", tone: "success", iconKey: "check" },
  completed: { label: "Completed", tone: "success", iconKey: "check" },
  sent: { label: "Sent", tone: "success", iconKey: "check" },
  submitted: { label: "Submitted", tone: "info", iconKey: "info" },
  acknowledged: { label: "Acknowledged", tone: "success", iconKey: "check" },
  active: { label: "Active", tone: "success", iconKey: "check" },
  inactive: { label: "Inactive", tone: "neutral", iconKey: "dot" },
  cancelled: { label: "Cancelled", tone: "neutral", iconKey: "x" },
  rejected: { label: "Rejected", tone: "danger", iconKey: "x" },
  discarded: { label: "Discarded", tone: "neutral", iconKey: "x" },
  present: { label: "Present", tone: "success", iconKey: "check" },
  absent: { label: "Absent", tone: "danger", iconKey: "x" },
  late: { label: "Late", tone: "warning", iconKey: "clock" },
  half_day: { label: "Half Day", tone: "info", iconKey: "clock" },
  on_leave: { label: "On Leave", tone: "neutral", iconKey: "info" },
  enrolled: { label: "Enrolled", tone: "info", iconKey: "info" },
  dropped: { label: "Dropped", tone: "neutral", iconKey: "x" },
  amended: { label: "Amended", tone: "info", iconKey: "info" },
  document_requested: { label: "Doc Requested", tone: "warning", iconKey: "alert" },
  document_attached: { label: "Doc Attached", tone: "success", iconKey: "check" },
  manager_approved: { label: "Manager Approved", tone: "info", iconKey: "check" },
  gm_approved: { label: "GM Approved", tone: "info", iconKey: "check" },
  director_approved: { label: "Director Approved", tone: "success", iconKey: "check" },
  hr_approved: { label: "HR Approved", tone: "success", iconKey: "check" },
  paid: { label: "Paid", tone: "success", iconKey: "check" },
  unpaid: { label: "Unpaid", tone: "warning", iconKey: "alert" },
  read: { label: "Read", tone: "neutral", iconKey: "dot" },
  unread: { label: "Unread", tone: "info", iconKey: "info" },
  warning: { label: "Warning", tone: "warning", iconKey: "alert" },
  info: { label: "Info", tone: "info", iconKey: "info" },
  success: { label: "Success", tone: "success", iconKey: "check" },
  error: { label: "Error", tone: "danger", iconKey: "x" },
  created: { label: "Created", tone: "success", iconKey: "check" },
  updated: { label: "Updated", tone: "info", iconKey: "info" },
  deleted: { label: "Deleted", tone: "danger", iconKey: "x" },
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
  general_manager_approved: "gm_approved",
  managerapproved: "manager_approved",
  gmapproved: "gm_approved",
};

function humanizeStatusKey(input: string): string {
  return input
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeStatusKey(status: string | null | undefined): string {
  if (!status || typeof status !== "string") {
    return "info";
  }
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "_");
  return STATUS_ALIASES[normalized] ?? normalized;
}

export function getStatusMeta(status: string | null | undefined): StatusMeta {
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
