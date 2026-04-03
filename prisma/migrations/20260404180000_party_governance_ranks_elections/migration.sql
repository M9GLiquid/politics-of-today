-- Party platform copy
ALTER TABLE "Party" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

-- Member ranks: PM | VICE_PM | COUNCIL | MEMBER
ALTER TABLE "PartyMember" ADD COLUMN "rank" TEXT NOT NULL DEFAULT 'MEMBER';

-- Published policy month (YYYY-MM) for national ballot window; null = legacy / always shown
ALTER TABLE "PartyPolicy" ADD COLUMN "publishedMonth" TEXT;

-- Drafts competing in this internal vote month (YYYY-MM)
ALTER TABLE "PartyPolicyDraft" ADD COLUMN "draftVotingMonth" TEXT;

-- Recreate PartyDraftVote with per-month voting
PRAGMA foreign_keys=OFF;
CREATE TABLE "PartyDraftVote_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "votingMonth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyDraftVote_new_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyDraftVote_new_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyDraftVote_new_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PartyDraftVote_new_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PartyPolicyDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "PartyDraftVote_new" ("id", "userId", "partyId", "categoryId", "draftId", "createdAt", "votingMonth")
SELECT "id", "userId", "partyId", "categoryId", "draftId", "createdAt", strftime('%Y-%m', 'now')
FROM "PartyDraftVote";
DROP TABLE "PartyDraftVote";
ALTER TABLE "PartyDraftVote_new" RENAME TO "PartyDraftVote";
CREATE UNIQUE INDEX "PartyDraftVote_userId_partyId_categoryId_votingMonth_key" ON "PartyDraftVote"("userId", "partyId", "categoryId", "votingMonth");
PRAGMA foreign_keys=ON;

-- Leadership: one vote per office per quarter (PM / VICE_PM)
CREATE TABLE "PartyOfficeLeadershipVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "office" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyOfficeLeadershipVote_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartyOfficeLeadershipVote_voter_party_period_office_key" ON "PartyOfficeLeadershipVote"("voterUserId", "partyId", "periodKey", "office");

-- Council: approval votes, many candidates per voter per quarter
CREATE TABLE "PartyCouncilLeadershipVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partyId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartyCouncilLeadershipVote_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PartyCouncilLeadershipVote_voter_party_period_candidate_key" ON "PartyCouncilLeadershipVote"("voterUserId", "partyId", "periodKey", "candidateUserId");

-- Founder becomes PM in PartyMember (one row per founder not already listed as member)
INSERT INTO "PartyMember" ("id", "userId", "partyId", "createdAt", "rank")
SELECT
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
  p."ownerUserId",
  p."id",
  CURRENT_TIMESTAMP,
  'PM'
FROM "Party" p
WHERE p."ownerUserId" IS NOT NULL
  AND p."isSystem" = 0
  AND NOT EXISTS (
    SELECT 1 FROM "PartyMember" m WHERE m."userId" = p."ownerUserId"
  );
