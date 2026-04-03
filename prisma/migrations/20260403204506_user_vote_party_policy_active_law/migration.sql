-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserCategoryMonthVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "categorySlug" TEXT NOT NULL,
    "partyPolicyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserCategoryMonthVote_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCategoryMonthVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCategoryMonthVote_partyPolicyId_fkey" FOREIGN KEY ("partyPolicyId") REFERENCES "PartyPolicy" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_UserCategoryMonthVote" ("categorySlug", "createdAt", "id", "month", "nationId", "userId", "year") SELECT "categorySlug", "createdAt", "id", "month", "nationId", "userId", "year" FROM "UserCategoryMonthVote";
DROP TABLE "UserCategoryMonthVote";
ALTER TABLE "new_UserCategoryMonthVote" RENAME TO "UserCategoryMonthVote";
CREATE UNIQUE INDEX "UserCategoryMonthVote_userId_month_categorySlug_key" ON "UserCategoryMonthVote"("userId", "month", "categorySlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
