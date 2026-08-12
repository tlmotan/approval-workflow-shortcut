import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { act, claimDetailInclude, toClaimView, type ActError } from "@/lib/claims";

const STATUS_BY_ERROR: Record<ActError, number> = {
  CLAIM_NOT_FOUND: 404,
  ACTOR_NOT_FOUND: 404,
  CLAIM_NOT_PENDING: 409,
  STAGE_ALREADY_DECIDED: 409,
  ROLE_MISMATCH: 403,
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { actorEmployeeId, decision, comment } = body ?? {};

  if (typeof actorEmployeeId !== "string" || !actorEmployeeId) {
    return NextResponse.json({ error: "actorEmployeeId is required" }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
  }

  const result = await act(id, actorEmployeeId, decision, comment || undefined, prisma);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: STATUS_BY_ERROR[result.error] }
    );
  }

  const claim = await prisma.expenseClaim.findUniqueOrThrow({
    where: { id },
    include: claimDetailInclude,
  });
  return NextResponse.json(toClaimView(claim));
}
