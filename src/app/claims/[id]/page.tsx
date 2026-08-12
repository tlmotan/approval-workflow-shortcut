import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, toClaimView, ROLES } from "@/lib/claims";
import { formatMYR, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
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
    <main className="mx-auto max-w-3xl flex-1 space-y-8 p-6">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to claims
      </Link>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{view.description}</h1>
            <p className="text-sm text-gray-500">
              {view.submitter.name} · {formatMYR(view.amount)} · {formatDateTime(view.createdAt)}
            </p>
          </div>
          <StatusBadge status={view.status} chain={view.chain} />
        </div>
        <p className="text-xs text-gray-500">
          Approval chain: {view.chain.join(" → ")}
        </p>
        {resubmissionSource && (
          <p className="text-xs text-gray-500">
            Resubmission of{" "}
            <Link href={`/claims/${resubmissionSource.id}`} className="underline">
              a previously rejected claim
            </Link>
            .
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">History</h2>
        {view.approvals.length === 0 ? (
          <p className="text-sm text-gray-500">No decisions yet.</p>
        ) : (
          <ul className="space-y-2">
            {view.approvals.map((a) => (
              <li
                key={a.stageIndex}
                className="rounded-lg border border-gray-200 p-3 text-sm"
              >
                <p>
                  <span className="font-medium">{a.actorName}</span> ({a.actorRole}){" "}
                  {a.decision === "approved" ? "approved" : "rejected"} stage {a.stageIndex + 1}
                </p>
                {a.comment && <p className="mt-1 text-gray-600">&ldquo;{a.comment}&rdquo;</p>}
                <p className="mt-1 text-xs text-gray-500">{formatDateTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
        >
          Resubmit as a new claim
        </Link>
      )}
    </main>
  );
}
