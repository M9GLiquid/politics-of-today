import { prisma } from "@/lib/prisma";
import {
  COUNCIL_SEATS,
  PARTY_RANK_COUNCIL,
  PARTY_RANK_MEMBER,
  PARTY_RANK_PM,
  PARTY_RANK_VICE_PM,
} from "@/lib/party-ranks";

/**
 * Tallies `periodKey` leadership ballots and rewrites PartyMember.rank for that party.
 * If an office had no votes, previous holders keep that office when possible.
 */
export async function applyLeadershipElectionResults(
  periodKey: string,
): Promise<void> {
  const parties = await prisma.party.findMany({
    where: { isSystem: false },
    select: { id: true },
  });

  for (const { id: partyId } of parties) {
    const anyOffice = await prisma.partyOfficeLeadershipVote.count({
      where: { partyId, periodKey },
    });
    const anyCouncil = await prisma.partyCouncilLeadershipVote.count({
      where: { partyId, periodKey },
    });
    if (anyOffice === 0 && anyCouncil === 0) continue;

    async function winnerForOffice(office: "PM" | "VICE_PM"): Promise<string | null> {
      const n = await prisma.partyOfficeLeadershipVote.count({
        where: { partyId, periodKey, office },
      });
      if (n === 0) return null;
      const rows = await prisma.partyOfficeLeadershipVote.groupBy({
        by: ["candidateUserId"],
        where: { partyId, periodKey, office },
        _count: { _all: true },
      });
      rows.sort((a, b) => b._count._all - a._count._all);
      return rows[0]?.candidateUserId ?? null;
    }

    const pmWinner = await winnerForOffice("PM");
    const viceWinner = await winnerForOffice("VICE_PM");

    const members = await prisma.partyMember.findMany({
      where: { partyId },
    });
    const prevRank = new Map(members.map((m) => [m.userId, m.rank]));

    const pmUser =
      pmWinner ??
      members.find((m) => m.rank === PARTY_RANK_PM)?.userId ??
      null;
    let viceUser =
      viceWinner ??
      members.find((m) => m.rank === PARTY_RANK_VICE_PM)?.userId ??
      null;

    if (viceUser === pmUser) {
      viceUser = null;
    }

    const councilSet = new Set<string>();
    if (anyCouncil > 0) {
      const councilRows = await prisma.partyCouncilLeadershipVote.groupBy({
        by: ["candidateUserId"],
        where: { partyId, periodKey },
        _count: { _all: true },
      });
      councilRows.sort((a, b) => b._count._all - a._count._all);
      for (const row of councilRows.slice(0, COUNCIL_SEATS)) {
        councilSet.add(row.candidateUserId);
      }
    } else {
      for (const m of members) {
        if (prevRank.get(m.userId) === PARTY_RANK_COUNCIL) {
          councilSet.add(m.userId);
        }
      }
    }

    for (const m of members) {
      let rank = PARTY_RANK_MEMBER;
      if (pmUser && m.userId === pmUser) {
        rank = PARTY_RANK_PM;
      } else if (viceUser && m.userId === viceUser) {
        rank = PARTY_RANK_VICE_PM;
      } else if (councilSet.has(m.userId)) {
        rank = PARTY_RANK_COUNCIL;
      }

      if (m.rank !== rank) {
        await prisma.partyMember.update({
          where: { id: m.id },
          data: { rank },
        });
      }
    }
  }
}
