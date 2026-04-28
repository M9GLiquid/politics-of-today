import { prisma } from "@/lib/prisma";
import { TOP_PARTY_BALLOT_SIZE } from "@/lib/constants";

export type RankedParty = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  _count: { upvotes: number };
};

type PartyUpvoteCount = { upvotes: number } | { PartyUpvote: number };

export function compareRankedPartiesByUpvotes(
  a: { createdAt: Date; _count: PartyUpvoteCount },
  b: { createdAt: Date; _count: PartyUpvoteCount },
): number {
  const aCount = "upvotes" in a._count ? a._count.upvotes : a._count.PartyUpvote;
  const bCount = "upvotes" in b._count ? b._count.upvotes : b._count.PartyUpvote;
  const diff = bCount - aCount;
  if (diff !== 0) return diff;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/**
 * Non-system parties sorted by upvotes (ties → older first).
 * With `nationId`, only upvotes from that nation count. Guests / null → global counts.
 */
export async function listRankedNonSystemParties(
  nationId?: string | null,
): Promise<RankedParty[]> {
  const parties = await prisma.party.findMany({
    where: { isSystem: false },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          PartyUpvote: nationId
            ? { where: { nationId } }
            : true,
          },
      },
    },
  });
  parties.sort(compareRankedPartiesByUpvotes);
  return parties.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    createdAt: p.createdAt,
    _count: { upvotes: p._count.PartyUpvote },
  }));
}

/**
 * Up to `TOP_PARTY_BALLOT_SIZE` parties with the most upvotes (ties → older first).
 * If there are fewer parties than the cap, zero-vote parties still appear so the ballot can fill.
 */
export async function getBallotPartyIds(
  nationId?: string | null,
): Promise<string[]> {
  const parties = await listRankedNonSystemParties(nationId);
  return parties.slice(0, TOP_PARTY_BALLOT_SIZE).map((p) => p.id);
}

export function rankedPartyIdsFromSorted(
  parties: Array<{ id: string }>,
): Set<string> {
  return new Set(
    parties.slice(0, TOP_PARTY_BALLOT_SIZE).map((p) => p.id),
  );
}

export function ballotIdSetFromRanked(
  parties: Array<{ id: string }>,
): Set<string> {
  return rankedPartyIdsFromSorted(parties);
}

export async function getSystemPartyId(): Promise<string | null> {
  const p = await prisma.party.findFirst({ where: { isSystem: true } });
  return p?.id ?? null;
}
