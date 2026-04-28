import {
  COUNCIL_SEATS,
  PARTY_RANK_COUNCIL,
  PARTY_RANK_MEMBER,
  PARTY_RANK_PM,
  PARTY_RANK_VICE_PM,
} from "@/lib/party-ranks";

export type PartyLeadershipMember = {
  id: string;
  userId: string;
  rank: string;
};

export type PartyDraft = {
  id: string;
  categoryId: string;
  catchPhrase: string;
  shortDescription: string;
  longDescription: string;
  budgetDeltaVsActive: number;
  monthsToComplete: number;
  taxNarrative: string;
  isContinuationOfStatusQuo: boolean;
  createdAt: Date;
};

export type SelectedPartyDraft = PartyDraft & {
  votes: number;
};

export function selectWinningDraftsByCategory(
  drafts: PartyDraft[],
  voteCounts: Map<string, number>,
): Map<string, SelectedPartyDraft> {
  const byCategory = new Map<string, PartyDraft[]>();
  for (const draft of drafts) {
    const list = byCategory.get(draft.categoryId) ?? [];
    list.push(draft);
    byCategory.set(draft.categoryId, list);
  }

  const selected = new Map<string, SelectedPartyDraft>();
  for (const [categoryId, list] of byCategory) {
    if (list.length === 0) continue;

    let best = list[0];
    let bestVotes = voteCounts.get(best.id) ?? 0;

    for (let i = 1; i < list.length; i++) {
      const cand = list[i];
      const votes = voteCounts.get(cand.id) ?? 0;
      if (votes > bestVotes) {
        best = cand;
        bestVotes = votes;
      } else if (votes === bestVotes) {
        if (cand.createdAt.getTime() < best.createdAt.getTime()) {
          best = cand;
        }
      }
    }

    selected.set(categoryId, { ...best, votes: bestVotes });
  }

  return selected;
}

export function selectLeadershipAssignments(input: {
  members: PartyLeadershipMember[];
  pmWinner: string | null;
  viceWinner: string | null;
  councilWinners: string[];
}): Map<string, string> {
  const { members, pmWinner, viceWinner, councilWinners } = input;
  const prevRank = new Map(members.map((member) => [member.userId, member.rank]));

  const pmUser =
    pmWinner ??
    members.find((member) => member.rank === PARTY_RANK_PM)?.userId ??
    null;
  let viceUser =
    viceWinner ??
    members.find((member) => member.rank === PARTY_RANK_VICE_PM)?.userId ??
    null;
  if (viceUser === pmUser) {
    viceUser = null;
  }

  const councilSet = new Set<string>();
  if (councilWinners.length > 0) {
    for (const userId of councilWinners.slice(0, COUNCIL_SEATS)) {
      councilSet.add(userId);
    }
  } else {
    for (const member of members) {
      if (prevRank.get(member.userId) === PARTY_RANK_COUNCIL) {
        councilSet.add(member.userId);
      }
    }
  }

  const ranksByUserId = new Map<string, string>();
  for (const member of members) {
    let rank = PARTY_RANK_MEMBER;
    if (pmUser && member.userId === pmUser) {
      rank = PARTY_RANK_PM;
    } else if (viceUser && member.userId === viceUser) {
      rank = PARTY_RANK_VICE_PM;
    } else if (councilSet.has(member.userId)) {
      rank = PARTY_RANK_COUNCIL;
    }
    ranksByUserId.set(member.userId, rank);
  }

  return ranksByUserId;
}
