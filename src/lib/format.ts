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
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "Rejected":
      return "bg-red-50 text-red-700 ring-red-600/20";
    case "Pending":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
  }
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
