"use client";

import { useState } from "react";
import Link from "next/link";
import { useStoredActorId, setStoredActorId } from "@/lib/actingAs";
import { UserIcon, ChevronDownIcon, PlusCircleIcon } from "./icons";

type Employee = { id: string; name: string; role: string };

export function TopBar({ employees }: { employees: Employee[] }) {
  const stored = useStoredActorId();
  const [manualId, setManualId] = useState<string | null>(null);

  const defaultId =
    stored && employees.some((e) => e.id === stored) ? stored : (employees[0]?.id ?? "");
  // manualId ?? defaultId, not useState(defaultId): defaultId depends on
  // localStorage (via useStoredActorId), which resolves after the first
  // render. Seeding useState with defaultId would snapshot "" (or the wrong
  // employee) at mount and never pick up the real value once it loads.
  // Deriving on every render means the dropdown reflects localStorage
  // immediately, and manualId only overrides it once the user actually picks
  // something.
  const actorId = manualId ?? defaultId;
  const actor = employees.find((e) => e.id === actorId);

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
      <div>
        <p className="mb-1 text-xs text-gray-500">Submitting/Acting as:</p>
        <div className="relative inline-flex items-center gap-2 rounded-md border border-gray-300 py-1.5 pl-3 pr-8 text-sm">
          <UserIcon className="h-4 w-4 text-gray-400" />
          <span className="font-medium text-gray-900">{actor?.name ?? "Select employee"}</span>
          {actor && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {actor.role}
            </span>
          )}
          <ChevronDownIcon className="pointer-events-none absolute right-2 h-4 w-4 text-gray-400" />
          <select
            aria-label="Submitting/Acting as"
            value={actorId}
            onChange={(e) => {
              setManualId(e.target.value);
              setStoredActorId(e.target.value);
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          >
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Link
        href="/?submit=1"
        className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <PlusCircleIcon className="h-4 w-4" />
        Submit New Claim
      </Link>
    </header>
  );
}
