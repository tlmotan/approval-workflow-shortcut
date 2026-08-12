import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { claimDetailInclude, toClaimView } from "@/lib/claims";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    include: claimDetailInclude,
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  return NextResponse.json(toClaimView(claim));
}
