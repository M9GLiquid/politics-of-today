UPDATE "PartyPolicyDraft" SET "draftVotingMonth" = strftime('%Y-%m', 'now') WHERE "draftVotingMonth" IS NULL;
