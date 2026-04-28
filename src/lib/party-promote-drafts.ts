import { prisma } from "@/lib/prisma";
import { votingMonthBeforePublish } from "@/lib/party-months";
import { selectWinningDraftsByCategory } from "@/lib/party-governance";

/**
 * For each non-system party and category: take the draft with the most internal votes
 * during `votingMonth` (the month before `publishMonth`), upsert PartyPolicy with
 * `publishedMonth = publishMonth`, then delete competing drafts (votes cascade).
 */
export async function promoteWinningDraftsForMonth(
  publishMonth: string,
): Promise<{ categoriesTouched: number }> {
  const votingMonth = votingMonthBeforePublish(publishMonth);
  const parties = await prisma.party.findMany({
    where: { isSystem: false },
    select: { id: true },
  });

  let categoriesTouched = 0;

  for (const p of parties) {
    const drafts = await prisma.partyPolicyDraft.findMany({
      where: { partyId: p.id, draftVotingMonth: votingMonth },
    });
    if (drafts.length === 0) continue;

    const counts = await prisma.partyDraftVote.groupBy({
      by: ["draftId"],
      where: { partyId: p.id, votingMonth },
      _count: { _all: true },
    });
    const countByDraft = new Map(
      counts.map((c) => [c.draftId, c._count._all]),
    );
    const selectedByCategory = selectWinningDraftsByCategory(
      drafts,
      countByDraft,
    );

    for (const [, best] of selectedByCategory) {
      categoriesTouched += 1;

      await prisma.$transaction([
        prisma.partyPolicy.upsert({
          where: {
            partyId_categoryId: {
              partyId: p.id,
              categoryId: best.categoryId,
            },
          },
          create: {
            partyId: p.id,
            categoryId: best.categoryId,
            catchPhrase: best.catchPhrase,
            shortDescription: best.shortDescription,
            longDescription: best.longDescription,
            budgetDeltaVsActive: best.budgetDeltaVsActive,
            monthsToComplete: best.monthsToComplete,
            taxNarrative: best.taxNarrative,
            isContinuationOfStatusQuo: best.isContinuationOfStatusQuo,
            publishedMonth: publishMonth,
          },
          update: {
            catchPhrase: best.catchPhrase,
            shortDescription: best.shortDescription,
            longDescription: best.longDescription,
            budgetDeltaVsActive: best.budgetDeltaVsActive,
            monthsToComplete: best.monthsToComplete,
            taxNarrative: best.taxNarrative,
            isContinuationOfStatusQuo: best.isContinuationOfStatusQuo,
            publishedMonth: publishMonth,
          },
        }),
        prisma.partyPolicyDraft.deleteMany({
          where: {
            partyId: p.id,
            categoryId: best.categoryId,
            draftVotingMonth: votingMonth,
          },
        }),
      ]);
    }
  }

  return { categoriesTouched };
}
