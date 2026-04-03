export type Category = {
  id: string;
  slug: string;
  name: string;
  /** Display order for radar (0 = top, clockwise) */
  order: number;
};

export type Party = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  accentColor: string;
};

export type Policy = {
  id: string;
  categoryId: string;
  partyId: string;
  catchPhrase: string;
  shortDescription: string;
  longDescription: string;
  /** Change in annual spend vs the active baseline for this category (+ spend, − cut) */
  budgetDeltaVsActive: number;
  /** Months from adoption to full effect */
  monthsToComplete: number;
  /** Narrative / model note on tax lever (shown alongside computed line) */
  taxNarrative: string;
  /** If true, this row represents “keep current government line” */
  isContinuationOfStatusQuo: boolean;
};

export type NationalLedger = {
  /** Total annual budget envelope (abstract billions) */
  annualBudgetCap: number;
  /** Spend already committed outside player-voted policies (baseline state) */
  baselineCommittedSpend: number;
  /** System-party status-quo policy id keyed by category slug (from DB). */
  activePolicyByCategory: Record<string, string>;
};

/** Legacy DB value only; sessions always use `"voter"`. Party founders have `partyId` set. */
export type UserRole = "voter" | "party";

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  /** Always `"voter"` for signed-in players. Use `partyId` for party-desk access. */
  role: "voter";
  /** Shown in header/profile: "Unaffiliated" or rank (PM, Member, …). */
  partyAffiliationLabel: string;
  /** Unique public tag (P-…); optional on legacy JWT until re-login. */
  playerCode?: string;
  partyId?: string;
  /** Present for accounts that have joined a nation (voters must have this to play). */
  nationId?: string;
  nationSlug?: string;
  /** Display name for header link (falls back to title-cased slug if missing in legacy JWT). */
  nationName?: string;
  nationCommitYear?: number;
};
