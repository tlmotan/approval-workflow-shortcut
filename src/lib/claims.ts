import type { PrismaClient, Prisma } from "@prisma/client";
import { prisma as defaultPrisma } from "./prisma";

export const ROLES = ["Manager", "Finance", "Director"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Amount thresholds are inclusive/exclusive per CLAUDE.md:
 * < 500 -> [Manager]; 500-2000 -> [Manager, Finance]; > 2000 -> [Manager, Finance, Director]
 */
export function computeChain(amount: number): Role[] {
  if (amount < 500) return ["Manager"];
  if (amount <= 2000) return ["Manager", "Finance"];
  return ["Manager", "Finance", "Director"];
}

export type ClaimStatus =
  | { kind: "Approved" }
  | { kind: "Rejected"; rejectedAtStage: number }
  | { kind: "Pending"; stage: number };

type ClaimForStatus = {
  chain: string;
  approvals: { stageIndex: number; decision: string }[];
};

/**
 * The single source of truth for a claim's status. Never store status as a
 * column — always derive it from the chain + approval history so it is
 * structurally impossible for it to drift from the underlying records.
 */
export function getClaimStatus(claim: ClaimForStatus): ClaimStatus {
  const chain = JSON.parse(claim.chain) as string[];

  const rejection = claim.approvals.find((a) => a.decision === "rejected");
  if (rejection) return { kind: "Rejected", rejectedAtStage: rejection.stageIndex };

  const approvedStages = new Set(
    claim.approvals.filter((a) => a.decision === "approved").map((a) => a.stageIndex)
  );
  for (let stage = 0; stage < chain.length; stage++) {
    if (!approvedStages.has(stage)) return { kind: "Pending", stage };
  }

  return { kind: "Approved" };
}

export async function submitClaim(
  input: { submitterId: string; amount: number; description: string; resubmittedFrom?: string },
  client: PrismaClient = defaultPrisma
) {
  const chain = computeChain(input.amount);
  return client.expenseClaim.create({
    data: {
      submitterId: input.submitterId,
      amount: input.amount,
      description: input.description,
      chain: JSON.stringify(chain),
      resubmittedFrom: input.resubmittedFrom,
    },
  });
}

export type Decision = "approved" | "rejected";

export type ActError =
  | "CLAIM_NOT_FOUND"
  | "ACTOR_NOT_FOUND"
  | "CLAIM_NOT_PENDING"
  | "STAGE_ALREADY_DECIDED"
  | "ROLE_MISMATCH";

export type ActResult =
  | { ok: true; status: ClaimStatus }
  | { ok: false; error: ActError; message: string };

/**
 * The only way an ApprovalRecord is ever created. Every check below runs
 * before the write, in the order specified by CLAUDE.md — this ordering is
 * what makes the core invariant hold by construction rather than by cleanup.
 */
export async function act(
  claimId: string,
  actorEmployeeId: string,
  decision: Decision,
  comment: string | undefined,
  client: PrismaClient = defaultPrisma
): Promise<ActResult> {
  const claim = await client.expenseClaim.findUnique({
    where: { id: claimId },
    include: { approvals: true },
  });
  if (!claim) return { ok: false, error: "CLAIM_NOT_FOUND", message: "Claim does not exist." };

  const actor = await client.employee.findUnique({ where: { id: actorEmployeeId } });
  if (!actor) return { ok: false, error: "ACTOR_NOT_FOUND", message: "Actor does not exist." };

  const status = getClaimStatus(claim);
  if (status.kind !== "Pending") {
    return {
      ok: false,
      error: "CLAIM_NOT_PENDING",
      message: `Claim is already ${status.kind}; no further action is possible.`,
    };
  }

  const currentStage = status.stage;

  const alreadyDecided = claim.approvals.some((a) => a.stageIndex === currentStage);
  if (alreadyDecided) {
    return {
      ok: false,
      error: "STAGE_ALREADY_DECIDED",
      message: "This stage was already decided.",
    };
  }

  const chain = JSON.parse(claim.chain) as string[];
  const requiredRole = chain[currentStage];
  if (actor.role !== requiredRole) {
    return {
      ok: false,
      error: "ROLE_MISMATCH",
      message: `This stage requires ${requiredRole}, but ${actor.name} is ${actor.role}.`,
    };
  }

  try {
    await client.approvalRecord.create({
      data: {
        claimId,
        stageIndex: currentStage,
        actorId: actor.id,
        actorName: actor.name,
        actorRole: actor.role,
        decision,
        comment,
      },
    });
  } catch (e) {
    // DB unique constraint (@@unique([claimId, stageIndex])) is the final
    // authority against a concurrent write that raced past the check above.
    if (isUniqueConstraintError(e)) {
      return {
        ok: false,
        error: "STAGE_ALREADY_DECIDED",
        message: "This stage was already decided.",
      };
    }
    throw e;
  }

  const updated = await client.expenseClaim.findUniqueOrThrow({
    where: { id: claimId },
    include: { approvals: true },
  });
  return { ok: true, status: getClaimStatus(updated) };
}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as Prisma.PrismaClientKnownRequestError).code === "P2002"
  );
}
