/** Voters at which `annualBudgetCap` applies as written (tax base normalization). */
export const REFERENCE_REGISTERED_VOTERS = 1_000_000;

/**
 * Reference fiscal cap shape (abstract billions). Per-nation envelopes scale from
 * voter pool + national tax/trade multipliers; active baseline policy ids come from the DB.
 */
export const nationalLedger = {
  annualBudgetCap: 1000,
  baselineCommittedSpend: 620,
} as const;

/**
 * Annual discretionary slice per category (abstract billions), status-quo envelopes.
 * Sum matches annualBudgetCap − baselineCommittedSpend so the six pillars fill the movable wedge.
 * Keys are category slugs (stable in DB seeds).
 */
export const categoryAnnualSpendBySlug: Record<string, number> = {
  infrastructure: 78,
  climate: 55,
  economy: 65,
  health: 85,
  education: 52,
  defense: 45,
};
