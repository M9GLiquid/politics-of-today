-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scope" TEXT NOT NULL,
    "nationId" TEXT,
    "monthKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "tagsCsv" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsItem_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldEventDefinition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "cadenceMonths" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorldEventInstance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "definitionId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldEventInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorldEventDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorldEventNationImpact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instanceId" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorldEventNationImpact_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorldEventInstance" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorldEventNationImpact_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VOTER',
    "isAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "isGameAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" DATETIME,
    "banReason" TEXT NOT NULL DEFAULT '',
    "mutedUntil" DATETIME,
    "wealth" REAL NOT NULL DEFAULT 0,
    "nationId" TEXT,
    "nationCommitYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "isAdministrator", "isGameAdministrator", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role", "wealth") SELECT "createdAt", "displayName", "email", "id", "isAdministrator", "isGameAdministrator", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role", "wealth" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_publicCode_key" ON "User"("publicCode");
CREATE INDEX "User_wealth_idx" ON "User"("wealth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "NewsItem_scope_monthKey_idx" ON "NewsItem"("scope", "monthKey");

-- CreateIndex
CREATE INDEX "NewsItem_nationId_monthKey_idx" ON "NewsItem"("nationId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEventDefinition_key_key" ON "WorldEventDefinition"("key");

-- CreateIndex
CREATE INDEX "WorldEventInstance_monthKey_idx" ON "WorldEventInstance"("monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEventInstance_definitionId_monthKey_key" ON "WorldEventInstance"("definitionId", "monthKey");

-- CreateIndex
CREATE INDEX "WorldEventNationImpact_nationId_idx" ON "WorldEventNationImpact"("nationId");

-- CreateIndex
CREATE UNIQUE INDEX "WorldEventNationImpact_instanceId_nationId_key" ON "WorldEventNationImpact"("instanceId", "nationId");
