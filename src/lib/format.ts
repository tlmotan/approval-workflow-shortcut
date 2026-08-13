import type { ClaimStatus } from "./claims";

export function describeStatus(status: ClaimStatus, chain: string[]): string {
  switch (status.kind) {
    case "Approved":
      return "Approved";
    case "Rejected":
      return `Rejected at stage ${status.rejectedAtStage + 1} (${chain[status.rejectedAtStage]})`;
    case "Pending":
      return `Pending — awaiting ${chain[status.stage]} (stage ${status.stage + 1} of ${chain.length})`;
  }
}

export function statusColorClasses(status: ClaimStatus): string {
  switch (status.kind) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700";
    case "Rejected":
      return "bg-red-100 text-red-700";
    case "Pending":
      return "bg-amber-100 text-amber-700";
  }
}

export function statusLabel(status: ClaimStatus): string {
  return status.kind;
}

export function formatMYR(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
  }).format(amount);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

/** Compact, human-scannable reference for a claim's cuid — display only, not a stored field. */
export function shortId(id: string): string {
  return `#${id.slice(0, 8).toUpperCase()}`;
}
