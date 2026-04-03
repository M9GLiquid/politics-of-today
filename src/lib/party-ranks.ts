import { prisma } from "@/lib/prisma";

export const PARTY_RANK_PM = "PM";
export const PARTY_RANK_VICE_PM = "VICE_PM";
export const PARTY_RANK_COUNCIL = "COUNCIL";
export const PARTY_RANK_MEMBER = "MEMBER";

export const COUNCIL_SEATS = 5;
export const MAX_COUNCIL_VOTES_PER_VOTER = 5;

/** Short label for header / profile (not uppercase). */
export function formatPartyRankForDisplay(rank: string): string {
  if (rank === PARTY_RANK_PM) return "PM";
  if (rank === PARTY_RANK_VICE_PM) return "Vice-PM";
  if (rank === PARTY_RANK_COUNCIL) return "Council";
  if (rank === PARTY_RANK_MEMBER) return "Member";
  return rank.replace(/_/g, "-");
}

export function canAuthorPolicyDraft(rank: string | null): boolean {
  if (!rank) return false;
  return (
    rank === PARTY_RANK_PM ||
    rank === PARTY_RANK_VICE_PM ||
    rank === PARTY_RANK_COUNCIL
  );
}

/**
 * Effective rank for governance: PartyMember.rank, or founder without a row treated as PM.
 */
export async function resolvePartyMemberRank(
  userId: string,
  partyId: string,
): Promise<string | null> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { ownerUserId: true },
  });
  if (!party) return null;

  const row = await prisma.partyMember.findUnique({
    where: { userId },
    select: { partyId: true, rank: true },
  });
  if (row?.partyId === partyId) {
    return row.rank;
  }
  if (party.ownerUserId === userId) {
    return PARTY_RANK_PM;
  }
  return null;
}
