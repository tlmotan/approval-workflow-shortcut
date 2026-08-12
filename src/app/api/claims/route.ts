import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, submitClaim, toClaimView } from "@/lib/claims";

export async function GET() {
  const claims = await prisma.expenseClaim.findMany({
    include: claimDetailInclude,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(claims.map(toClaimView));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { submitterId, amount, description, resubmittedFrom } = body ?? {};

  if (typeof submitterId !== "string" || !submitterId) {
    return NextResponse.json({ error: "submitterId is required" }, { status: 400 });
  }
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }
  if (typeof description !== "string" || !description.trim()) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  const claim = await submitClaim(
    { submitterId, amount, description, resubmittedFrom },
    prisma
  );

  const withDetail = await prisma.expenseClaim.findUniqueOrThrow({
    where: { id: claim.id },
    include: claimDetailInclude,
  });
  return NextResponse.json(toClaimView(withDetail), { status: 201 });
}
