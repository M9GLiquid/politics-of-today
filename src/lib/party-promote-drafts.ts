import { prisma } from "@/lib/prisma";
import { votingMonthBeforePublish } from "@/lib/party-months";

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

    const byCategory = new Map<string, typeof drafts>();
    for (const d of drafts) {
      const list = byCategory.get(d.categoryId) ?? [];
      list.push(d);
      byCategory.set(d.categoryId, list);
    }

    for (const [, list] of byCategory) {
      if (list.length === 0) continue;
      let best = list[0];
      let bestVotes = countByDraft.get(best.id) ?? 0;
      for (let i = 1; i < list.length; i++) {
        const cand = list[i];
        const v = countByDraft.get(cand.id) ?? 0;
        if (v > bestVotes) {
          best = cand;
          bestVotes = v;
        } else if (v === bestVotes) {
          if (cand.createdAt.getTime() < best.createdAt.getTime()) {
            best = cand;
          }
        }
      }

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
