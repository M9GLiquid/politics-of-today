import { prisma } from "@/lib/prisma";
import type { Category } from "@/types/game";
import { getSystemPartyId } from "@/lib/ballot-parties";

/**
 * Categories with at least one recorded policy vote use the plurality winner;
 * others keep the global system status-quo deltas.
 */
export function mergeActiveLawDeltasForNation(
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

type SlugTally = {
  categorySlug: string;
  partyPolicyId: string | null;
  _count: { _all: number };
};

/**
 * For each category, pick the PartyPolicy with the most votes this year.
 * Ties prefer the system status-quo row when it is tied; otherwise lowest id.
 */
export function winningPolicyIdsFromSlugTallies(
  tallies: SlugTally[],
  slugToCategoryId: Map<string, string>,
  baselinePolicyIdByCategoryId: Map<string, string>,
): Map<string, string> {
  const bySlug = new Map<string, Array<{ policyId: string; count: number }>>();
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
    const maxCount = Math.max(...candidates.map((c) => c.count));
    const top = candidates.filter((c) => c.count === maxCount);
    const baselineId = baselinePolicyIdByCategoryId.get(categoryId);
    let winner: string;
    if (baselineId && top.some((t) => t.policyId === baselineId)) {
      winner = baselineId;
    } else {
      winner = top.map((t) => t.policyId).sort()[0]!;
    }
    categoryIdToPolicyId.set(categoryId, winner);
  }
  return categoryIdToPolicyId;
}

async function baselinePolicyIdByCategory(): Promise<Map<string, string>> {
  const systemId = await getSystemPartyId();
  const map = new Map<string, string>();
  if (!systemId) return map;
  const rows = await prisma.partyPolicy.findMany({
    where: { partyId: systemId, isContinuationOfStatusQuo: true },
    select: { id: true, categoryId: true },
  });
  for (const row of rows) {
    map.set(row.categoryId, row.id);
  }
  return map;
}

async function policyDeltasForIds(
  policyIds: Iterable<string>,
): Promise<Map<string, { categoryId: string; budgetDeltaVsActive: number }>> {
  const ids = [...new Set(policyIds)];
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await prisma.partyPolicy.findMany({
    where: { id: { in: ids } },
    select: { id: true, categoryId: true, budgetDeltaVsActive: true },
  });
  return new Map(
    rows.map((r) => [
      r.id,
      { categoryId: r.categoryId, budgetDeltaVsActive: r.budgetDeltaVsActive },
    ]),
  );
}

function categoryDeltaMapFromWinners(
  winners: Map<string, string>,
  policyInfo: Map<string, { categoryId: string; budgetDeltaVsActive: number }>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const [categoryId, policyId] of winners) {
    const p = policyInfo.get(policyId);
    out.set(categoryId, p?.budgetDeltaVsActive ?? 0);
  }
  return out;
}

/** Plurality-winning PartyPolicy id per category (categoryId → id) for this nation and year. */
export async function winningPolicyIdMapForNation(
  nationId: string,
  year: number,
  categories: Category[],
): Promise<Map<string, string>> {
  const slugToCategoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const [baselineIds, tallies] = await Promise.all([
    baselinePolicyIdByCategory(),
    prisma.userCategoryMonthVote.groupBy({
      by: ["categorySlug", "partyPolicyId"],
      where: {
        nationId,
        year,
        partyPolicyId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);
  return winningPolicyIdsFromSlugTallies(
    tallies,
    slugToCategoryId,
    baselineIds,
  );
}

/** Slug-keyed active policy ids for ledger metadata (fallback: system baseline per category). */
export function activePolicySlugRecord(
  winnersByCategoryId: Map<string, string>,
  categories: Category[],
  baselineBySlug: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of categories) {
    out[c.slug] =
      winnersByCategoryId.get(c.id) ?? baselineBySlug[c.slug] ?? "";
  }
  return out;
}

/** Per-category budget delta (reference bn) from this nation's active law for the given year. */
export async function activeLawBudgetDeltaMapForNation(
  nationId: string,
  year: number,
  categories: Category[],
): Promise<Map<string, number>> {
  const winners = await winningPolicyIdMapForNation(nationId, year, categories);
  const policyInfo = await policyDeltasForIds(winners.values());
  return categoryDeltaMapFromWinners(winners, policyInfo);
}

/** Same as repeated `activeLawBudgetDeltaMapForNation`, one groupBy for all nations. */
export async function activeLawBudgetDeltasByNationForYear(
  year: number,
  categories: Category[],
): Promise<Map<string, Map<string, number>>> {
  const slugToCategoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const [baselineIds, tallies] = await Promise.all([
    baselinePolicyIdByCategory(),
    prisma.userCategoryMonthVote.groupBy({
      by: ["nationId", "categorySlug", "partyPolicyId"],
      where: {
        year,
        partyPolicyId: { not: null },
      },
      _count: { _all: true },
    }),
  ]);

  const byNation = new Map<
    string,
    Array<{
      categorySlug: string;
      partyPolicyId: string | null;
      _count: { _all: number };
    }>
  >();
  for (const row of tallies) {
    const list = byNation.get(row.nationId) ?? [];
    list.push({
      categorySlug: row.categorySlug,
      partyPolicyId: row.partyPolicyId,
      _count: row._count,
    });
    byNation.set(row.nationId, list);
  }

  const winnersPerNation = new Map<string, Map<string, string>>();
  const allWinnerIds = new Set<string>();
  for (const [nationId, nationTallies] of byNation) {
    const winners = winningPolicyIdsFromSlugTallies(
      nationTallies,
      slugToCategoryId,
      baselineIds,
    );
    winnersPerNation.set(nationId, winners);
    for (const id of winners.values()) {
      allWinnerIds.add(id);
    }
  }

  const policyInfo = await policyDeltasForIds(allWinnerIds);
  const result = new Map<string, Map<string, number>>();
  for (const [nationId, winners] of winnersPerNation) {
    result.set(nationId, categoryDeltaMapFromWinners(winners, policyInfo));
  }
  return result;
}

/** Merged per-category reference deltas (active law + status-quo fallback) and winning policy ids. */
export async function mergedCategoryBudgetDeltasForNation(
  nationId: string | null | undefined,
  year: number,
  categories: Category[],
  statusQuo: Map<string, number>,
): Promise<{ merged: Map<string, number>; winners: Map<string, string> }> {
  let winners = new Map<string, string>();
  if (nationId) {
    winners = await winningPolicyIdMapForNation(nationId, year, categories);
  }
  const policyInfo = await policyDeltasForIds(winners.values());
  const activePartial = categoryDeltaMapFromWinners(winners, policyInfo);
  const merged = mergeActiveLawDeltasForNation(
    activePartial.size > 0 ? activePartial : undefined,
    statusQuo,
    categories,
  );
  return { merged, winners };
}
