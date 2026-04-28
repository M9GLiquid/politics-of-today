import { prisma } from "@/lib/prisma";
import { selectLeadershipAssignments } from "@/lib/party-governance";

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
    const councilRows =
      anyCouncil > 0
        ? await prisma.partyCouncilLeadershipVote.groupBy({
            by: ["candidateUserId"],
            where: { partyId, periodKey },
            _count: { _all: true },
          })
        : [];
    councilRows.sort((a, b) => b._count._all - a._count._all);
    const ranksByUserId = selectLeadershipAssignments({
      members,
      pmWinner,
      viceWinner,
      councilWinners: councilRows.map((row) => row.candidateUserId),
    });

    for (const m of members) {
      const rank = ranksByUserId.get(m.userId) ?? m.rank;

      if (m.rank !== rank) {
        await prisma.partyMember.update({
          where: { id: m.id },
          data: { rank },
        });
      }
    }
  }
}
