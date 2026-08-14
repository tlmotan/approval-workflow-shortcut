import type { ClaimStatus, ClaimView } from "@/lib/claims";
import { formatDateTime } from "@/lib/format";

type StageState = "done" | "current" | "rejected" | "upcoming";

/**
 * Display-only derivation, separate from getClaimStatus(). A Rejected claim
 * still marks every stage before rejectedAtStage as "done" (checkmarked),
 * not grayed out — those stages were genuinely approved before the
 * rejection happened, and the UI should reflect that real history rather
 * than treating the whole chain as failed. Only the stage that was actually
 * rejected gets the "rejected" (X) state.
 */
function getStageStates(chain: string[], status: ClaimStatus): StageState[] {
  if (status.kind === "Approved") return chain.map(() => "done");
  if (status.kind === "Rejected") {
    return chain.map((_, i) => {
      if (i < status.rejectedAtStage) return "done";
      if (i === status.rejectedAtStage) return "rejected";
      return "upcoming";
    });
  }
  return chain.map((_, i) => {
    if (i < status.stage) return "done";
    if (i === status.stage) return "current";
    return "upcoming";
  });
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
      <path
        fillRule="evenodd"
        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const dotClasses: Record<StageState, string> = {
  done: "bg-emerald-600 text-white",
  current: "bg-white text-amber-500 ring-2 ring-amber-500",
  rejected: "bg-red-600 text-white",
  upcoming: "bg-white text-gray-300 ring-2 ring-gray-200",
};

const lineClasses: Record<StageState, string> = {
  done: "bg-emerald-500",
  current: "bg-gray-200",
  rejected: "bg-gray-200",
  upcoming: "bg-gray-200",
};

export function ApprovalStepper({
  chain,
  status,
}: {
  chain: string[];
  status: ClaimStatus;
}) {
  const states = getStageStates(chain, status);

  return (
    <div className="flex items-center">
      {chain.map((role, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${dotClasses[states[i]]}`}
            >
              {states[i] === "done" && <CheckIcon />}
              {states[i] === "rejected" && <XIcon />}
            </span>
            <span className="whitespace-nowrap text-[11px] text-gray-500">{role}</span>
          </div>
          {i < chain.length - 1 && (
            <span className={`mx-1 mb-4 h-0.5 w-10 shrink-0 ${lineClasses[states[i]]}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ApprovalTimeline({
  chain,
  status,
  approvals,
}: {
  chain: string[];
  status: ClaimStatus;
  approvals: ClaimView["approvals"];
}) {
  const states = getStageStates(chain, status);
  const byStage = new Map(approvals.map((a) => [a.stageIndex, a]));

  return (
    <ol>
      {chain.map((role, i) => {
        const record = byStage.get(i);
        const isLast = i === chain.length - 1;
        return (
          <li key={i} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${lineClasses[states[i]]}`}
              />
            )}
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dotClasses[states[i]]}`}
            >
              {states[i] === "done" && <CheckIcon />}
              {states[i] === "rejected" && <XIcon />}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">{role} Approval</p>
                {record && (
                  <span className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(record.createdAt)}
                  </span>
                )}
              </div>
              {record ? (
                <p className="text-sm text-gray-500">
                  {record.actorName} · {record.actorRole}
                  {record.decision === "rejected" && (
                    <span className="text-red-600"> · Rejected</span>
                  )}
                </p>
              ) : states[i] === "current" ? (
                <p className="text-sm text-amber-600">Awaiting {role} approval</p>
              ) : (
                <p className="text-sm text-gray-400">Pending</p>
              )}
              {record?.comment && (
                <p className="mt-1 text-sm text-gray-600">&ldquo;{record.comment}&rdquo;</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
