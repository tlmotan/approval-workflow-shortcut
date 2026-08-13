"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmitClaimForm } from "./SubmitClaimForm";

type Employee = { id: string; name: string; role: string };

export function SubmitClaimLauncher({
  employees,
  initialOpen,
  resubmittedFrom,
  defaultDescription,
}: {
  employees: Employee[];
  initialOpen: boolean;
  resubmittedFrom?: string;
  defaultDescription?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initialOpen);

  if (!open) return null;

  return (
    <SubmitClaimForm
      employees={employees}
      resubmittedFrom={resubmittedFrom}
      defaultDescription={defaultDescription}
      onClose={() => {
        setOpen(false);
        router.replace("/", { scroll: false });
      }}
    />
  );
}
