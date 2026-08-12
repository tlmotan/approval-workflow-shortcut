# Expense Claim Approval Workflow

## What this is

A multi-stage expense claim approval engine. An employee submits a claim; it moves
through an ordered chain of approvers determined by the claim amount. The system
must make it **structurally impossible** for a claim to reach "Approved" unless
every required stage genuinely approved it, in order, with nothing rejected along
the way.

This is a state machine correctness problem, not a CRUD app. Optimize for a design
where the invariant below is *guaranteed by construction* — not checked after the
fact with a validation function bolted on top.

## Stack

- Next.js (App Router) + TypeScript
- Prisma ORM + SQLite (file-based, zero setup — do not switch to Postgres, no need for this scope)
- No auth system — use a simple actor picker (dropdown of seeded employees/roles).
  Do not build real authentication. This is explicitly out of scope.

## Core invariant (the whole point of this project)

> `status == "Approved"` **if and only if** every stage in the claim's chain has
> an `ApprovalRecord` with `decision = "approved"`, in stage order, **and no
> `ApprovalRecord` with `decision = "rejected"` exists anywhere in that claim's history.**

Every design decision should trace back to protecting this invariant. When in doubt,
ask: "does this change make it possible to violate the invariant?" If yes, don't do it.

## Identity model — name + role, no auth

There is no login system. Instead, seed a small fixed list of employees, each with
a `name` and a `role`. Both the "submit claim" form and the "act on claim" form use
a dropdown picker populated from this seeded list — never free-text name entry.
Free-text breaks the assignment check (typos, casing, duplicate names) and adds
ambiguity that has nothing to do with the actual problem being solved here.

**Enforcement is role-based; attribution is name-based.** The approval chain only
specifies required *roles* (`["Manager", "Finance", "Director"]`). `act()` checks
whether the selected actor's `role` matches the role required at the current stage
— it does not check for one specific named individual. This means any employee
with the Manager role can approve a Manager-stage claim, which mirrors how real
approval chains work. But every `ApprovalRecord` still stores the actor's actual
`name`, so the audit trail reads like "Approved by Ahmad Zaki (Manager)" rather
than an anonymous role tag.

Seed data (adjust names freely, keep the shape):

```
{ name: "Ahmad Zaki", role: "Manager" }
{ name: "Sarah Lim",  role: "Finance" }
{ name: "Priya Nair", role: "Director" }
{ name: "Wei Ming",   role: "Employee" }   // submits claims, never approves
```

`Employee` is not a role that ever appears in an approval chain — it's only used
for the "submitting as" picker. Anyone with a Manager/Finance/Director role could
also submit a claim as themselves; don't over-restrict who can submit.

## Scope — exactly two features, nothing else

### Feature 1: Chain-aware claim submission
Submitting a claim computes and **locks in** its approval chain based on amount,
at submission time:
- < RM500 → `[Manager]`
- RM500–2000 → `[Manager, Finance]`
- \> RM2000 → `[Manager, Finance, Director]`

The chain is immutable once set. Do not recompute it later even if "policy" changes
elsewhere in the app — mutating an in-progress state machine's structure is exactly
the kind of thing that breaks correctness guarantees. This is a deliberate design
decision, not a shortcut — document it as such.

### Feature 2: Guarded sequential approval
An `act(claimId, actorEmployeeId, decision)` function is the **only** way an
`ApprovalRecord` gets created. Before writing anything, it must check, in this
order:

1. Does the claim exist, and is its status still `Pending`? (Reject action on an
   already-`Approved` or already-`Rejected` claim.)
2. Is there already an `ApprovalRecord` for this claim at the *current* stage?
   (Guards against double-submission / race conditions — see below.)
3. Does the selected actor's `role` match the role required at the *current*
   stage specifically (not any stage — the current one)? Look up the actor's
   role from the seeded employee list by `actorEmployeeId`.
4. Only then: write the `ApprovalRecord`, storing the actor's actual `name`
   (not just their role) for attribution, and recompute claim status from the
   full history (see "status is derived" below).

**Status is derived, never set directly.** Do not have a mutable `status` field
that gets manually flipped to `"Approved"` by application code in some branch.
Compute it from the `ApprovalRecord` history every time: if any rejection exists →
`Rejected`; if all stages have approvals → `Approved`; otherwise → `Pending(stage=n)`.

### Explicitly out of scope — do not build these
- Notifications / emails
- Real authentication or session management
- Editing an in-flight claim
- Multi-branch / parallel approval paths
- Dashboards, analytics, reporting views
- Resubmission linking beyond what's specified below

## Data model

```prisma
model Employee {
  id   String @id @default(cuid())
  name String
  role String // "Manager" | "Finance" | "Director" | "Employee"
}

model ExpenseClaim {
  id            String   @id @default(cuid())
  submitterId   String
  submitter     Employee @relation(fields: [submitterId], references: [id])
  amount        Decimal
  description   String
  chain         String   // JSON array of role strings, e.g. ["Manager","Finance"], locked at creation
  createdAt     DateTime @default(now())
  resubmittedFrom String? // optional FK to a prior rejected ExpenseClaim.id

  approvals     ApprovalRecord[]
}

model ApprovalRecord {
  id         String   @id @default(cuid())
  claimId    String
  claim      ExpenseClaim @relation(fields: [claimId], references: [id])
  stageIndex Int
  actorId    String
  actor      Employee @relation(fields: [actorId], references: [id])
  actorName  String   // denormalized snapshot of actor.name at time of decision
  actorRole  String   // denormalized snapshot of actor.role at time of decision
  decision   String   // "approved" | "rejected"
  comment    String?
  createdAt  DateTime @default(now())

  @@unique([claimId, stageIndex]) // enforces: only one decision per stage, ever
}
```

`actorName`/`actorRole` are deliberately denormalized (copied onto the record at
write time) rather than always joined live from `Employee`. This keeps the audit
trail stable even if an employee's role changes later — "Approved by Ahmad Zaki
(Manager)" should reflect who they were *at the time*, not their current role.

Note the `@@unique([claimId, stageIndex])` constraint — this is what stops two
people both approving the same stage (race condition / shared-credential case).
Let the database enforce this, not application-level checking alone. If a second
write is attempted for the same claim+stage, the DB rejects it — catch that error
and surface it as "this stage was already decided."

`status` is **not a column**. It is always computed from `chain` + `approvals`.
Write one function, `getClaimStatus(claim)`, and use it everywhere — never
duplicate this logic.

## Resubmission

If a claim is rejected, the employee may submit a new claim. This is a **new**
`ExpenseClaim` row (new id), not a reopened old one — same pattern as a brokerage
app showing a fresh order after a failed one. Set `resubmittedFrom` to the old
claim's id so history is traceable. The old claim and its `ApprovalRecord` rows
are never deleted or modified.

## Required test cases (write these before or alongside the UI, not after)

1. RM300 claim → Manager approves → status = `Approved`.
2. RM1500 claim → Manager approves → Finance approves → status = `Approved`.
3. RM5000 claim → Manager approves → Finance rejects → status = `Rejected`;
   Director stage is never reachable.
4. Attempt to approve stage 2 (Finance) before stage 1 (Manager) has decided →
   rejected by `act()`.
5. Attempt to approve as an employee whose role doesn't match the role required
   at the current stage (e.g. Finance tries to act on a Manager-stage claim) →
   rejected.
6. Attempt any action on an already-`Rejected` or already-`Approved` claim →
   rejected.
7. Two concurrent `act()` calls for the same claim+stage → exactly one
   `ApprovalRecord` is written; the second fails cleanly (tests the DB unique
   constraint).

## Build order

1. Prisma schema + migration. No UI yet.
2. `getClaimStatus()` and `act()` as pure, testable functions. Write the 7 tests
   above against these directly — no HTTP layer involved yet.
3. Minimal API routes wrapping those functions.
4. Minimal UI: submit claim form, claim list/detail view showing current stage
   and full history, actor picker + approve/reject buttons.
5. Two flowcharts for docs: (a) the state diagram — Pending(stage 0..n) →
   Approved, with Rejected as an absorbing state reachable from any stage;
   (b) the submission → act → recompute-status lifecycle.
6. Docs (1–2 pages): the invariant, why the chain is locked at submission
   (not recomputed live), why status is derived not stored, what you'd check
   before real users touched this.

## Things to keep saying no to

If a change doesn't serve the invariant above, it's scope creep. When unsure
whether to add something, the answer is: finish the two features cleanly,
write the tests, write honest docs about what's not handled (e.g. no partial
approvals, no delegation if an approver is unavailable) — don't build those
things, just name them as known limitations in the docs.