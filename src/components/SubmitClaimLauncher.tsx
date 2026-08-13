"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SubmitClaimForm } from "./SubmitClaimForm";

type Employee = { id: string; name: string; role: string };

/**
 * Open/closed state is derived from the URL (via useSearchParams) rather
 * than snapshotted into local state at mount. Client-side navigation
 * (e.g. clicking "Submit New Claim" while already on "/") updates props on
 * the same component instance without remounting it, so a plain
 * useState(initialOpen) would never see the change — deriving from the
 * live search params avoids that.
 */
export function SubmitClaimLauncher({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resubmittedFrom = searchParams.get("resubmitFrom") ?? undefined;
  const defaultDescription = searchParams.get("description") ?? undefined;
  const open = searchParams.get("submit") === "1" || Boolean(resubmittedFrom);

  if (!open) return null;

  return (
    <SubmitClaimForm
      employees={employees}
      resubmittedFrom={resubmittedFrom}
      defaultDescription={defaultDescription}
      onClose={() => router.replace("/", { scroll: false })}
    />
  );
}
