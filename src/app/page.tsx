import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, toClaimView } from "@/lib/claims";
import { formatMYR, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitClaimForm } from "@/components/SubmitClaimForm";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ resubmitFrom?: string; description?: string }>;
}) {
  const { resubmitFrom, description } = await searchParams;

  const [employees, claims] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.expenseClaim.findMany({
      include: claimDetailInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const claimViews = claims.map(toClaimView);

  return (
    <main className="mx-auto max-w-3xl flex-1 space-y-8 p-6">
      <header>
        <h1 className="text-lg font-semibold text-gray-900">Expense Claim Approval</h1>
        <p className="text-sm text-gray-500">
          Submit a claim, then watch it move through its locked-in approval chain.
        </p>
      </header>

      <SubmitClaimForm
        employees={employees}
        resubmittedFrom={resubmitFrom}
        defaultDescription={description}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Claims</h2>
        {claimViews.length === 0 && (
          <p className="text-sm text-gray-500">No claims submitted yet.</p>
        )}
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
          {claimViews.map((claim) => (
            <li key={claim.id}>
              <Link
                href={`/claims/${claim.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {claim.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {claim.submitter.name} · {formatMYR(claim.amount)} ·{" "}
                    {formatDateTime(claim.createdAt)}
                    {claim.resubmittedFrom && " · resubmission"}
                  </p>
                </div>
                <StatusBadge status={claim.status} chain={claim.chain} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
