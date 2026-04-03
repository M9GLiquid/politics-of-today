/*
  Warnings:

  - Made the column `publicCode` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
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
    "nationId" TEXT,
    "nationCommitYear" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "displayName", "email", "id", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role") SELECT "createdAt", "displayName", "email", "id", "nationCommitYear", "nationId", "passwordHash", "publicCode", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_publicCode_key" ON "User"("publicCode");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
