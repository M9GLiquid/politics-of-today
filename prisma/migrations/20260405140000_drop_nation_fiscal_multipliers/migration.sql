-- RedefineTables: Nation without per-row fiscal multipliers (reference model only).
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Nation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_Nation" ("id", "name", "slug", "sortOrder") SELECT "id", "name", "slug", "sortOrder" FROM "Nation";
DROP TABLE "Nation";
ALTER TABLE "new_Nation" RENAME TO "Nation";
CREATE UNIQUE INDEX "Nation_slug_key" ON "Nation"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
