import type { ClaimStatus } from "@/lib/claims";
import { describeStatus, statusColorClasses } from "@/lib/format";

export function StatusBadge({ status, chain }: { status: ClaimStatus; chain: string[] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusColorClasses(status)}`}
    >
      {describeStatus(status, chain)}
    </span>
  );
}
