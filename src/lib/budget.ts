import { nationalLedger } from "@/lib/data/ledger";
import type { NationalLedger } from "@/types/game";

export type FiscalImpact = {
  /** Annual spend if this policy replaces the active line in its category */
  newAnnualCategorySpend: number;
  /** Delta vs currently active policy in that category */
  deltaVsActive: number;
  /** Total national annual spend after swap (simplified model) */
  projectedTotalSpend: number;
  /** Positive if over cap → must borrow in this toy model */
  borrowingNeeded: number;
  /** 0–1 rough “tax pressure” index for UI */
  taxPressureIndex: number;
  summaryLine: string;
};

/**
 * Toy fiscal model: baseline committed + category envelopes.
 * `activeCategorySpend` = spend attributed to current law in this category (abstract units).
 */
export function computeFiscalImpact(
  ledger: NationalLedger,
  activeCategorySpend: number,
  budgetDeltaVsActive: number,
): FiscalImpact {
  const deltaVsActive = budgetDeltaVsActive;
  const newAnnualCategorySpend = Math.max(0, activeCategorySpend + deltaVsActive);

  const otherSpend = ledger.baselineCommittedSpend;
  const projectedTotalSpend = otherSpend + newAnnualCategorySpend;
  const over = projectedTotalSpend - ledger.annualBudgetCap;
  const borrowingNeeded = over > 0 ? over : 0;

  const taxPressureIndex = Math.min(
    1,
    Math.max(0, borrowingNeeded / (ledger.annualBudgetCap * 0.15 || 1)),
  );

  let summaryLine: string;
  if (borrowingNeeded <= 0) {
    summaryLine = "Fits within the national envelope—no extra borrowing in this simplified model.";
  } else {
    summaryLine = `Over the annual cap by ${borrowingNeeded.toFixed(0)} (abstract billions). Borrowing implies higher debt service; tax mix or other cuts must absorb it in later turns.`;
  }

  return {
    newAnnualCategorySpend,
    deltaVsActive,
    projectedTotalSpend,
    borrowingNeeded,
    taxPressureIndex,
    summaryLine,
  };
}

/** Placeholder “spend” for the active line per category (abstract, for deltas to stack visually) */
export function assumedActiveCategorySpend(): number {
  return 45;
}

const REF_CAP = nationalLedger.annualBudgetCap;

/**
 * Ledger scaled so cap matches a nation’s annual envelope (same relative shape as the reference model).
 */
export function scaledNationalLedger(
  nationTotalAnnual: number,
  activePolicyByCategory: Record<string, string>,
): NationalLedger {
  const scale = REF_CAP > 0 ? nationTotalAnnual / REF_CAP : 1;
  return {
    annualBudgetCap: nationTotalAnnual,
    baselineCommittedSpend: nationalLedger.baselineCommittedSpend * scale,
    activePolicyByCategory: { ...activePolicyByCategory },
  };
}

/** Map reference-model billions into a nation-sized economy. */
export function scaleFiscalMagnitude(
  referenceBillions: number,
  nationTotalAnnual: number,
): number {
  if (REF_CAP <= 0) return referenceBillions;
  return referenceBillions * (nationTotalAnnual / REF_CAP);
}
