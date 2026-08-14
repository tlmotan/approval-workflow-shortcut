import { beforeEach, afterAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { act, computeChain, getClaimStatus, submitClaim } from "../claims";
import { createTestClient, employeeByRole, resetDb } from "./test-db";

const client: PrismaClient = createTestClient();

beforeEach(async () => {
  await resetDb(client);
});

afterAll(async () => {
  await client.$disconnect();
});

async function submit(amount: number, description = "test claim") {
  const employee = await employeeByRole(client, "Employee");
  return submitClaim({ submitterId: employee.id, amount, description }, client);
}

describe("computeChain", () => {
  it("routes below RM500 to Manager only", () => {
    expect(computeChain(300)).toEqual(["Manager"]);
  });

  it("routes RM500-2000 to Manager, Finance", () => {
    expect(computeChain(500)).toEqual(["Manager", "Finance"]);
    expect(computeChain(2000)).toEqual(["Manager", "Finance"]);
  });

  it("routes above RM2000 to Manager, Finance, Director", () => {
    expect(computeChain(2001)).toEqual(["Manager", "Finance", "Director"]);
  });

  // Boundary Value Analysis on the RM500/RM2000 thresholds, at fractional
  // amounts (not just round numbers) since `amount` is a Decimal — this is
  // the exact edge where a rounding/comparison bug would hide.
  describe("RM500 boundary", () => {
    it("routes RM499.99 (just below) to Manager only", () => {
      expect(computeChain(499.99)).toEqual(["Manager"]);
    });

    it("routes RM500.01 (just above) to Manager, Finance", () => {
      expect(computeChain(500.01)).toEqual(["Manager", "Finance"]);
    });
  });

  describe("RM2000 boundary", () => {
    it("routes RM1999.99 (just below) to Manager, Finance", () => {
      expect(computeChain(1999.99)).toEqual(["Manager", "Finance"]);
    });

    it("routes RM2000.01 (just above) to Manager, Finance, Director", () => {
      expect(computeChain(2000.01)).toEqual(["Manager", "Finance", "Director"]);
    });
  });
});

describe("required scenarios", () => {
  it("1. RM300 claim -> Manager approves -> status = Approved", async () => {
    const claim = await submit(300);
    const manager = await employeeByRole(client, "Manager");

    const result = await act(claim.id, manager.id, "approved", undefined, client);

    expect(result.ok).toBe(true);
    expect(result.ok && result.status).toEqual({ kind: "Approved" });
  });

  it("2. RM1500 claim -> Manager approves -> Finance approves -> status = Approved", async () => {
    const claim = await submit(1500);
    const manager = await employeeByRole(client, "Manager");
    const finance = await employeeByRole(client, "Finance");

    await act(claim.id, manager.id, "approved", undefined, client);
    const result = await act(claim.id, finance.id, "approved", undefined, client);

    expect(result.ok).toBe(true);
    expect(result.ok && result.status).toEqual({ kind: "Approved" });
  });

  it("3. RM5000 claim -> Manager approves -> Finance rejects -> Rejected; Director stage never reachable", async () => {
    const claim = await submit(5000);
    const manager = await employeeByRole(client, "Manager");
    const finance = await employeeByRole(client, "Finance");
    const director = await employeeByRole(client, "Director");

    await act(claim.id, manager.id, "approved", undefined, client);
    const result = await act(claim.id, finance.id, "rejected", "over budget", client);

    expect(result.ok).toBe(true);
    expect(result.ok && result.status).toEqual({ kind: "Rejected", rejectedAtStage: 1 });

    // Director stage is never reachable: acting now must fail as CLAIM_NOT_PENDING,
    // not be silently accepted.
    const directorAttempt = await act(claim.id, director.id, "approved", undefined, client);
    expect(directorAttempt.ok).toBe(false);
    expect(!directorAttempt.ok && directorAttempt.error).toBe("CLAIM_NOT_PENDING");
  });

  it("4. Attempt to approve stage 2 (Finance) before stage 1 (Manager) has decided -> rejected", async () => {
    const claim = await submit(1500);
    const finance = await employeeByRole(client, "Finance");

    const result = await act(claim.id, finance.id, "approved", undefined, client);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("ROLE_MISMATCH");

    // Confirm nothing was written: the claim is still pending at stage 0.
    const fresh = await client.expenseClaim.findUniqueOrThrow({
      where: { id: claim.id },
      include: { approvals: true },
    });
    expect(getClaimStatus(fresh)).toEqual({ kind: "Pending", stage: 0 });
  });

  it("5. Actor whose role doesn't match the current stage's role -> rejected", async () => {
    const claim = await submit(300); // chain = [Manager] only
    const finance = await employeeByRole(client, "Finance");

    const result = await act(claim.id, finance.id, "approved", undefined, client);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("ROLE_MISMATCH");
  });

  it("6. Any action on an already-Rejected or already-Approved claim -> rejected", async () => {
    const approvedClaim = await submit(300);
    const manager = await employeeByRole(client, "Manager");
    await act(approvedClaim.id, manager.id, "approved", undefined, client);

    const onApproved = await act(approvedClaim.id, manager.id, "approved", undefined, client);
    expect(onApproved.ok).toBe(false);
    expect(!onApproved.ok && onApproved.error).toBe("CLAIM_NOT_PENDING");

    const rejectedClaim = await submit(300);
    await act(rejectedClaim.id, manager.id, "rejected", undefined, client);

    const onRejected = await act(rejectedClaim.id, manager.id, "approved", undefined, client);
    expect(onRejected.ok).toBe(false);
    expect(!onRejected.ok && onRejected.error).toBe("CLAIM_NOT_PENDING");
  });

  it("7. Two concurrent act() calls for the same claim+stage -> exactly one ApprovalRecord written", async () => {
    const claim = await submit(300);
    const manager = await employeeByRole(client, "Manager");

    const [first, second] = await Promise.allSettled([
      act(claim.id, manager.id, "approved", undefined, client),
      act(claim.id, manager.id, "approved", undefined, client),
    ]);

    const results = [first, second].map((r) =>
      r.status === "fulfilled" ? r.value : { ok: false as const, error: "THREW" as const, message: String(r.reason) }
    );

    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].ok === false && failed[0].error).toBe("STAGE_ALREADY_DECIDED");

    const records = await client.approvalRecord.findMany({
      where: { claimId: claim.id, stageIndex: 0 },
    });
    expect(records).toHaveLength(1);
  });
});
