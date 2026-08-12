-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ExpenseClaim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submitterId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resubmittedFrom" TEXT,
    CONSTRAINT "ExpenseClaim_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "stageIndex" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRecord_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "ExpenseClaim" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Employee" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRecord_claimId_stageIndex_key" ON "ApprovalRecord"("claimId", "stageIndex");
