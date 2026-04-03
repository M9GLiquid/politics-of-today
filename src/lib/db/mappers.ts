import type { Category, Party, Policy } from "@/types/game";
import type { Category as PrismaCategory, Party as PrismaParty, PartyPolicy } from "@prisma/client";

export function toGameCategory(row: PrismaCategory): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    order: row.sortOrder,
  };
}

export function toGameParty(row: PrismaParty): Party {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    accentColor: row.accentColor,
  };
}

export function toGamePolicy(row: PartyPolicy): Policy {
  return {
    id: row.id,
    categoryId: row.categoryId,
    partyId: row.partyId,
    catchPhrase: row.catchPhrase,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    budgetDeltaVsActive: row.budgetDeltaVsActive,
    monthsToComplete: row.monthsToComplete,
    taxNarrative: row.taxNarrative,
    isContinuationOfStatusQuo: row.isContinuationOfStatusQuo,
  };
}
