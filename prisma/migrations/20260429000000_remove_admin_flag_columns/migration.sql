-- Drop legacy admin/dev flag columns from User.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'VOTER',
    "bannedAt" DATETIME,
    "banReason" TEXT NOT NULL DEFAULT '',
    "mutedUntil" DATETIME,
    "wealth" REAL NOT NULL DEFAULT 0,
    "nationId" TEXT,
    "nationCommitYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("banReason", "bannedAt", "createdAt", "displayName", "email", "id", "mutedUntil", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role", "wealth") SELECT "banReason", "bannedAt", "createdAt", "displayName", "email", "id", "mutedUntil", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role", "wealth" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_publicCode_key" ON "User"("publicCode");
CREATE INDEX "User_wealth_idx" ON "User"("wealth");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
