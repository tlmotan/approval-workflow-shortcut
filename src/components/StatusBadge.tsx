import type { ClaimStatus } from "@/lib/claims";
import { describeStatus, statusColorClasses, statusLabel } from "@/lib/format";

export function StatusBadge({ status, chain }: { status: ClaimStatus; chain: string[] }) {
  return (
    <span
      title={describeStatus(status, chain)}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColorClasses(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
