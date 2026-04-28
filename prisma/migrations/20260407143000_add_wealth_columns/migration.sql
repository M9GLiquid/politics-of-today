-- Add wealth fields used by leaderboard rankings.
ALTER TABLE "Nation" ADD COLUMN "accumulativeWealth" REAL NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "wealth" REAL NOT NULL DEFAULT 0;

CREATE INDEX "Nation_accumulativeWealth_idx" ON "Nation"("accumulativeWealth");
CREATE INDEX "User_wealth_idx" ON "User"("wealth");
