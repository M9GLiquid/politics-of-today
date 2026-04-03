import { prisma } from "@/lib/prisma";
import { getBallotPartyIds, getSystemPartyId } from "@/lib/ballot-parties";
import { utcMonthKey } from "@/lib/party-months";
import { toGameParty, toGamePolicy } from "@/lib/db/mappers";
import type { Party, Policy } from "@/types/game";

export type PolicyWithParty = { policy: Policy; party: Party | null };

export async function listPoliciesForCategoryBallot(
  categoryId: string,
  ballotNationId?: string | null,
): Promise<PolicyWithParty[]> {
  const [ballotIds, systemId] = await Promise.all([
    getBallotPartyIds(ballotNationId),
    getSystemPartyId(),
  ]);

  const ballotMonth = utcMonthKey();

  const orBranches: Array<{
    partyId: string | { in: string[] };
    OR?: Array<{ publishedMonth: string | null }>;
  }> = [];
  if (systemId) {
    orBranches.push({ partyId: systemId });
  }
  if (ballotIds.length > 0) {
    orBranches.push({
      partyId: { in: ballotIds },
      OR: [{ publishedMonth: ballotMonth }, { publishedMonth: null }],
    });
  }

  if (orBranches.length === 0) {
    return [];
  }

  const rows = await prisma.partyPolicy.findMany({
    where: {
      categoryId,
      OR: orBranches,
    },
    include: { Party: true },
  });

  rows.sort((a, b) => {
    if (a.isContinuationOfStatusQuo !== b.isContinuationOfStatusQuo) {
      return a.isContinuationOfStatusQuo ? -1 : 1;
    }
    return a.catchPhrase.localeCompare(b.catchPhrase);
  });

  return rows.map((row) => ({
    policy: toGamePolicy(row),
    party: row.Party.isSystem ? null : toGameParty(row.Party),
  }));
}

/** System-party status-quo row ids keyed by category slug (for ledger / diagnostics). */
export async function getActiveBaselinePolicyIdsByCategorySlug(): Promise<
  Record<string, string>
> {
  const systemId = await getSystemPartyId();
  if (!systemId) return {};
  const rows = await prisma.partyPolicy.findMany({
    where: {
      partyId: systemId,
      isContinuationOfStatusQuo: true,
    },
    select: { id: true, Category: { select: { slug: true } } },
  });
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.Category.slug] = row.id;
  }
  return out;
}

export async function getBaselinePolicyForCategory(
  categoryId: string,
): Promise<Policy | null> {
  const systemId = await getSystemPartyId();
  if (!systemId) return null;
  const row = await prisma.partyPolicy.findFirst({
    where: {
      partyId: systemId,
      categoryId,
      isContinuationOfStatusQuo: true,
    },
  });
  return row ? toGamePolicy(row) : null;
}

/** System-party status-quo row per category (for national radar, one query). */
export async function getStatusQuoBudgetDeltaByCategoryId(): Promise<
  Map<string, number>
> {
  const systemId = await getSystemPartyId();
  const map = new Map<string, number>();
  if (!systemId) return map;
  const rows = await prisma.partyPolicy.findMany({
    where: {
      partyId: systemId,
      isContinuationOfStatusQuo: true,
    },
    select: { categoryId: true, budgetDeltaVsActive: true },
  });
  for (const row of rows) {
    map.set(row.categoryId, row.budgetDeltaVsActive);
  }
  return map;
}
