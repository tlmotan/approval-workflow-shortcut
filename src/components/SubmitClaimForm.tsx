"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStoredActorId, setStoredActorId } from "@/lib/actingAs";
import { UserIcon } from "./icons";

type Employee = { id: string; name: string; role: string };

const CHAIN_ROLES = ["Manager", "Finance", "Director"] as const;

/**
 * Display-only preview mirroring computeChain() in lib/claims.ts. The
 * server recomputes the real chain in submitClaim() — this never writes
 * anything, so duplicating the thresholds here can't desync the invariant.
 */
function previewChain(amount: number): string[] {
  if (!Number.isFinite(amount) || amount <= 0) return [];
  if (amount < 500) return ["Manager"];
  if (amount <= 2000) return ["Manager", "Finance"];
  return ["Manager", "Finance", "Director"];
}

export function SubmitClaimForm({
  employees,
  resubmittedFrom,
  defaultDescription,
  onClose,
}: {
  employees: Employee[];
  resubmittedFrom?: string;
  defaultDescription?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const stored = useStoredActorId();
  const [manualSubmitterId, setManualSubmitterId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Same live-default pattern as TopBar/ActPanel: recomputed every render
  // from the stored value rather than snapshotted once via useState, so it
  // can't go stale relative to what's actually in localStorage.
  const defaultSubmitterId =
    stored && employees.some((e) => e.id === stored) ? stored : (employees[0]?.id ?? "");
  const submitterId = manualSubmitterId ?? defaultSubmitterId;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const chain = previewChain(Number(amount));
  const submitter = employees.find((e) => e.id === submitterId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!submitterId) {
      setError("Choose who is submitting.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }
    if (!description.trim()) {
      setError("Enter a description.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterId,
          amount: parsedAmount,
          description: description.trim(),
          resubmittedFrom,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit claim.");
        return;
      }
      router.push(`/claims/${data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="border-b border-gray-100 pb-4 text-xl font-semibold text-gray-900">
          {resubmittedFrom ? "Resubmit Expense Claim" : "Submit Expense Claim"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="submitterId" className="block text-sm font-medium text-gray-900">
              Submitting as
            </label>
            <div className="relative mt-1">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                id="submitterId"
                value={submitterId}
                onChange={(e) => {
                  setManualSubmitterId(e.target.value);
                  setStoredActorId(e.target.value);
                }}
                className="block w-full rounded-md border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role})
                  </option>
                ))}
              </select>
            </div>
            {submitter && (
              <span className="mt-1 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {submitter.role}
              </span>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-900">
                Amount (RM)
              </label>
              <div className="mt-1 flex rounded-md border border-gray-300">
                <span className="flex items-center rounded-l-md bg-gray-50 px-3 text-sm text-gray-500">
                  RM
                </span>
                <input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full rounded-r-md px-3 py-2.5 text-sm outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="mt-3 rounded-lg bg-blue-50/60 p-3">
                <p className="mb-2 text-xs font-medium text-gray-700">This amount requires:</p>
                <div className="flex items-center gap-2">
                  {CHAIN_ROLES.map((role, i) => {
                    const inChain = chain.includes(role);
                    return (
                      <div key={role} className="flex items-center gap-2">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full ring-2 ${
                              inChain
                                ? "bg-white text-blue-600 ring-blue-600"
                                : "bg-white text-gray-300 ring-gray-200"
                            }`}
                          >
                            <UserIcon className="h-4 w-4" />
                          </span>
                          <span
                            className={`text-[11px] ${inChain ? "text-blue-700" : "text-gray-400"}`}
                          >
                            {role}
                          </span>
                        </div>
                        {i < CHAIN_ROLES.length - 1 && (
                          <span className="mb-4 text-gray-300">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block h-[calc(100%-1.75rem)] min-h-32 w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm"
                placeholder="Enter a brief description of the expense..."
                maxLength={500}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
