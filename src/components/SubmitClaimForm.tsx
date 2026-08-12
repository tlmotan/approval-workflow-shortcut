"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Employee = { id: string; name: string; role: string };

export function SubmitClaimForm({
  employees,
  resubmittedFrom,
  defaultDescription,
}: {
  employees: Employee[];
  resubmittedFrom?: string;
  defaultDescription?: string;
}) {
  const router = useRouter();
  const [submitterId, setSubmitterId] = useState(employees[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setAmount("");
      setDescription("");
      router.push(`/claims/${data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-gray-900">
        {resubmittedFrom ? "Resubmit claim" : "Submit a claim"}
      </h2>

      <div>
        <label htmlFor="submitterId" className="block text-sm font-medium text-gray-700">
          Submitting as
        </label>
        <select
          id="submitterId"
          value={submitterId}
          onChange={(e) => setSubmitterId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.role})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Amount (RM)
        </label>
        <input
          id="amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500">
          &lt;500 → Manager · 500–2000 → Manager, Finance · &gt;2000 → Manager, Finance, Director
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
