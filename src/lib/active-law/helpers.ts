import type { Category } from "@/types/game";

export type PolicyVoteTally = {
  policyId: string;
  count: number;
};

export type PolicyDeltaInfo = {
  categoryId: string;
  budgetDeltaVsActive: number;
};

/**
 * Categories with at least one recorded policy vote use the plurality winner;
 * others keep the global status-quo deltas.
 */
export function mergeActiveLawDeltas(
  activePartial: Map<string, number> | undefined,
  statusQuo: Map<string, number>,
  categories: Category[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of categories) {
    if (activePartial?.has(c.id)) {
      out.set(c.id, activePartial.get(c.id)!);
    } else {
      out.set(c.id, statusQuo.get(c.id) ?? 0);
    }
  }
  return out;
}

export function comparePolicyVoteTally(
  a: PolicyVoteTally,
  b: PolicyVoteTally,
  baselinePolicyId?: string,
): number {
  if (a.count !== b.count) {
    return b.count - a.count;
  }

  const aIsBaseline = baselinePolicyId ? a.policyId === baselinePolicyId : false;
  const bIsBaseline = baselinePolicyId ? b.policyId === baselinePolicyId : false;
  if (aIsBaseline !== bIsBaseline) {
    return aIsBaseline ? -1 : 1;
  }

  const aId = a.policyId;
  const bId = b.policyId;
  return aId < bId ? -1 : aId > bId ? 1 : 0;
}

export function chooseWinningPolicyId(
  candidates: PolicyVoteTally[],
  baselinePolicyId?: string,
): string | undefined {
  if (candidates.length === 0) {
    return undefined;
  }
  return [...candidates].sort((a, b) =>
    comparePolicyVoteTally(a, b, baselinePolicyId),
  )[0]?.policyId;
}

export function winningPolicyIdsByCategoryFromSlugTallies(
  tallies: Array<{
    categorySlug: string;
    partyPolicyId: string | null;
    _count: { _all: number };
  }>,
  slugToCategoryId: Map<string, string>,
  baselinePolicyIdByCategoryId: Map<string, string>,
): Map<string, string> {
  const bySlug = new Map<string, PolicyVoteTally[]>();
  for (const row of tallies) {
    if (!row.partyPolicyId) continue;
    if (!slugToCategoryId.has(row.categorySlug)) continue;
    const list = bySlug.get(row.categorySlug) ?? [];
    list.push({ policyId: row.partyPolicyId, count: row._count._all });
    bySlug.set(row.categorySlug, list);
  }

  const categoryIdToPolicyId = new Map<string, string>();
  for (const [slug, candidates] of bySlug) {
    const categoryId = slugToCategoryId.get(slug);
    if (!categoryId) continue;
    const baselineId = baselinePolicyIdByCategoryId.get(categoryId);
    const winner = chooseWinningPolicyId(candidates, baselineId);
    if (winner) {
      categoryIdToPolicyId.set(categoryId, winner);
    }
  }
  return categoryIdToPolicyId;
}

export function categoryDeltaMapFromWinners(
  winners: Map<string, string>,
  policyInfo: Map<string, PolicyDeltaInfo>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [categoryId, policyId] of winners) {
    const p = policyInfo.get(policyId);
    out.set(categoryId, p?.budgetDeltaVsActive ?? 0);
  }
  return out;
}
