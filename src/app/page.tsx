import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, toClaimView } from "@/lib/claims";
import { formatMYR, formatDateTime, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalStepper } from "@/components/ApprovalStepper";
import { SubmitClaimLauncher } from "@/components/SubmitClaimLauncher";

const FILTERS = ["all", "pending", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: Filter = FILTERS.includes(status as Filter) ? (status as Filter) : "all";

  const [employees, claims] = await Promise.all([
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.expenseClaim.findMany({
      include: claimDetailInclude,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const claimViews = claims
    .map(toClaimView)
    .filter((c) => filter === "all" || c.status.kind.toLowerCase() === filter);

  return (
    <>
      <main className="mx-auto max-w-6xl flex-1 space-y-6 p-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Expense Claims</h1>
              <p className="text-sm text-gray-500">Review and take action on expense claims</p>
            </div>
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
              {FILTERS.map((f) => (
                <Link
                  key={f}
                  href={f === "all" ? "/" : `/?status=${f}`}
                  className={`rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
                    filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f}
                </Link>
              ))}
            </div>
          </div>

          {claimViews.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-500">No claims found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="py-2.5 pr-4 font-medium">Claim ID</th>
                    <th className="py-2.5 pr-4 font-medium">Submitter</th>
                    <th className="py-2.5 pr-4 font-medium">Amount (RM)</th>
                    <th className="py-2.5 pr-4 font-medium">Approval Progress</th>
                    <th className="py-2.5 pr-4 font-medium">Status</th>
                    <th className="py-2.5 font-medium">Submitted On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {claimViews.map((claim) => (
                    <tr key={claim.id} className="group">
                      <td className="py-3 pr-4 align-top">
                        <Link
                          href={`/claims/${claim.id}`}
                          className="font-medium text-gray-900 group-hover:text-blue-600"
                        >
                          {shortId(claim.id)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Link href={`/claims/${claim.id}`} className="block">
                          <p className="truncate font-medium text-gray-900">
                            {claim.submitter.name}
                          </p>
                          <p className="max-w-[16rem] truncate text-xs text-gray-500">
                            {claim.description}
                          </p>
                        </Link>
                      </td>
                      <td className="py-3 pr-4 align-top text-gray-900">
                        <Link href={`/claims/${claim.id}`} className="block">
                          {formatMYR(claim.amount)}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Link href={`/claims/${claim.id}`} className="block">
                          <ApprovalStepper chain={claim.chain} status={claim.status} />
                        </Link>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <Link href={`/claims/${claim.id}`} className="block">
                          <StatusBadge status={claim.status} chain={claim.chain} />
                        </Link>
                      </td>
                      <td className="py-3 align-top text-gray-500">
                        <Link href={`/claims/${claim.id}`} className="block">
                          {formatDateTime(claim.createdAt)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500">
            Showing {claimViews.length} of {claims.length} claims
          </p>
        </div>
      </main>

      <Suspense fallback={null}>
        <SubmitClaimLauncher employees={employees} />
      </Suspense>
    </>
  );
}
