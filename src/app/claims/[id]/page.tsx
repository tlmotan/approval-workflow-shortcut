import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, toClaimView, ROLES } from "@/lib/claims";
import { formatMYR, formatDateTime, shortId } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ApprovalTimeline } from "@/components/ApprovalStepper";
import { ActPanel } from "@/components/ActPanel";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    include: claimDetailInclude,
  });
  if (!claim) notFound();

  const view = toClaimView(claim);

  const approvers = await prisma.employee.findMany({
    where: { role: { in: [...ROLES] } },
    orderBy: { name: "asc" },
  });

  const resubmissionSource = view.resubmittedFrom
    ? await prisma.expenseClaim.findUnique({ where: { id: view.resubmittedFrom } })
    : null;

  return (
    <main className="mx-auto max-w-6xl flex-1 space-y-6 p-8">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to Claims
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">Claim ID</p>
                <p className="font-medium text-gray-900">{shortId(view.id)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-2xl font-semibold text-gray-900">{formatMYR(view.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted by</p>
                <p className="font-medium text-gray-900">{view.submitter.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Submitted on</p>
                <p className="font-medium text-gray-900">{formatDateTime(view.createdAt)}</p>
              </div>
              <StatusBadge status={view.status} chain={view.chain} />
            </div>
            {resubmissionSource && (
              <p className="mt-4 text-xs text-gray-500">
                Resubmission of{" "}
                <Link href={`/claims/${resubmissionSource.id}`} className="underline">
                  {shortId(resubmissionSource.id)}
                </Link>
                , a previously rejected claim.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="mb-6 text-sm font-semibold text-gray-900">Approval Progress</h2>
            <ApprovalTimeline chain={view.chain} status={view.status} approvals={view.approvals} />
          </div>

          {view.status.kind === "Pending" && (
            <ActPanel
              claimId={view.id}
              requiredRole={view.chain[view.status.stage]}
              approvers={approvers}
            />
          )}

          {view.status.kind === "Rejected" && (
            <Link
              href={`/?resubmitFrom=${view.id}&description=${encodeURIComponent(view.description)}`}
              className="inline-block rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Resubmit as a new claim
            </Link>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900">Claim Details</h2>

          <div>
            <p className="text-xs text-gray-500">Description</p>
            <p className="text-sm text-gray-900">{view.description}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Approval Chain</p>
            <p className="text-sm text-gray-900">{view.chain.join(" → ")}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Submission Date</p>
            <p className="text-sm text-gray-900">{formatDateTime(view.createdAt)}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Claim ID</p>
            <p className="text-sm text-gray-900">{shortId(view.id)}</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-lg font-semibold text-gray-900">{formatMYR(view.amount)}</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
