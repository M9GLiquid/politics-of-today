import type { Category } from "@/types/game";
import {
  categoryAnnualSpendBySlug,
} from "@/lib/data/ledger";
import { getStatusQuoBudgetDeltaByCategoryId } from "@/lib/db/policies";

export type RadarBudgetRow = {
  name: string;
  slug: string;
  /** % of total national budget (radar outer ring scales to max category). */
  pctOfFullBudget: number;
};

export async function radarBudgetRowsForCategories(
  categories: Category[],
  annualEnvelope: number,
  /** When provided, avoids a duplicate DB round-trip (e.g. home carousel). */
  deltaByCategory?: Map<string, number>,
): Promise<RadarBudgetRow[]> {
  const cap = annualEnvelope;
  const deltaByCategoryResolved =
    deltaByCategory ?? (await getStatusQuoBudgetDeltaByCategoryId());
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return sorted.map((c) => {
    const base = categoryAnnualSpendBySlug[c.slug] ?? 0;
    const delta = deltaByCategoryResolved.get(c.id) ?? 0;
    const spend = Math.max(0, base + delta);
    const pct = cap > 0 ? (spend / cap) * 100 : 0;
    return { name: c.name, slug: c.slug, pctOfFullBudget: pct };
  });
}
