"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredActorId, setStoredActorId } from "@/lib/actingAs";
import { UserIcon } from "./icons";

type Employee = { id: string; name: string; role: string };

export function ActPanel({
  claimId,
  requiredRole,
  approvers,
}: {
  claimId: string;
  requiredRole: string;
  approvers: Employee[];
}) {
  const router = useRouter();
  const stored = useStoredActorId();
  const [manualId, setManualId] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);

  // Same live-default pattern as TopBar: recomputed every render (not
  // useState(defaultId), which would go stale) so it reacts if the stored
  // pick changes. Ordered to prefer an approver matching this stage's
  // required role — a convenience only; act() re-checks the role server-side
  // regardless of what's preselected here.
  const defaultId =
    (stored && approvers.some((a) => a.id === stored) ? stored : undefined) ??
    approvers.find((a) => a.role === requiredRole)?.id ??
    approvers[0]?.id ??
    "";
  const actorEmployeeId = manualId ?? defaultId;
  const actor = approvers.find((a) => a.id === actorEmployeeId);

  async function act(decision: "approved" | "rejected") {
    setError(null);
    setSubmitting(decision);
    try {
      const res = await fetch(`/api/claims/${claimId}/act`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorEmployeeId, decision, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Action failed.");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="actorEmployeeId" className="block text-sm font-medium text-gray-900">
            Acting as
          </label>
          <div className="relative mt-1">
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              id="actorEmployeeId"
              value={actorEmployeeId}
              onChange={(e) => {
                setManualId(e.target.value);
                setStoredActorId(e.target.value);
              }}
              className="block w-full rounded-md border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
            >
              {approvers.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>
          {actor && (
            <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {actor.role}
            </span>
          )}
        </div>

        <button
          onClick={() => act("approved")}
          disabled={submitting !== null}
          className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting === "approved" ? "Approving…" : "✓ Approve"}
        </button>
        <button
          onClick={() => act("rejected")}
          disabled={submitting !== null}
          className="flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {submitting === "rejected" ? "Rejecting…" : "✕ Reject"}
        </button>
      </div>

      <p className="text-xs text-gray-500">
        This stage requires <span className="font-medium text-gray-700">{requiredRole}</span>.
        Any employee can be picked above — the server rejects the action if their role doesn&apos;t
        match.
      </p>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-900">
          Comment (optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="Add a comment (optional)…"
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
