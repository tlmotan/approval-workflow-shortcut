"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [actorEmployeeId, setActorEmployeeId] = useState(
    approvers.find((a) => a.role === requiredRole)?.id ?? approvers[0]?.id ?? ""
  );
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"approved" | "rejected" | null>(null);

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
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900">
        Act on this claim — current stage requires {requiredRole}
      </h2>

      <div>
        <label htmlFor="actorEmployeeId" className="block text-sm font-medium text-gray-700">
          Acting as
        </label>
        <select
          id="actorEmployeeId"
          value={actorEmployeeId}
          onChange={(e) => setActorEmployeeId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {approvers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.role})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Any employee can be picked here — the server rejects the action if their role
          doesn&apos;t match what this stage requires.
        </p>
      </div>

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          Comment (optional)
        </label>
        <input
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={() => act("approved")}
          disabled={submitting !== null}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting === "approved" ? "Approving…" : "Approve"}
        </button>
        <button
          onClick={() => act("rejected")}
          disabled={submitting !== null}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting === "rejected" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}
