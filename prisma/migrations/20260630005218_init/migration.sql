-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "choice" TEXT,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "isConsensus" BOOLEAN,
    "rewardAwarded" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealedAt" DATETIME,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "modelA" TEXT NOT NULL,
    "responseA" TEXT NOT NULL,
    "modelB" TEXT NOT NULL,
    "responseB" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'standard',
    "rewardBase" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'open',
    "consensusChoice" TEXT,
    "raterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT,
    "email" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cortexBalance" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 100,
    "ratingsCount" INTEGER NOT NULL DEFAULT 0,
    "consensusHits" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "Earning_createdAt_idx" ON "Earning"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Earning_dayKey_idx" ON "Earning"("dayKey" ASC);

-- CreateIndex
CREATE INDEX "Earning_userId_idx" ON "Earning"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_taskId_userId_key" ON "Rating"("taskId" ASC, "userId" ASC);

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId" ASC);

-- CreateIndex
CREATE INDEX "Rating_taskId_idx" ON "Rating"("taskId" ASC);

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category" ASC);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status" ASC);

-- CreateIndex
CREATE INDEX "User_cortexBalance_idx" ON "User"("cortexBalance" ASC);

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress" ASC);
