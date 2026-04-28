import { ECONOMY_CONFIG } from "@/lib/constants";
import { nationalLedger, REFERENCE_REGISTERED_VOTERS } from "@/lib/data/ledger";

/**
 * Annual fiscal model (abstract billions, same units as `nationalLedger.annualBudgetCap`).
 * Static hauls are base levels; each voter adds a tenure curve on top.
 */
export const NATIONAL_ECONOMY_BASE = {
  /** Domestic tax revenue before per-capita integration effects */
  taxesAnnual: ECONOMY_CONFIG.nationalEconomy.base.taxesAnnual,
  /** Export earnings (raises fiscal room) */
  exportsAnnual: ECONOMY_CONFIG.nationalEconomy.base.exportsAnnual,
  /** Import bill / outward leakage (reduces fiscal room vs exports) */
  importsAnnual: ECONOMY_CONFIG.nationalEconomy.base.importsAnnual,
} as const;

/**
 * At `REFERENCE_REGISTERED_VOTERS` fully integrated voters, population should add this much
 * annual revenue so static + population ≈ `nationalLedger.annualBudgetCap`.
 */
const POPULATION_TARGET_AT_REFERENCE =
  nationalLedger.annualBudgetCap -
  (NATIONAL_ECONOMY_BASE.taxesAnnual +
    NATIONAL_ECONOMY_BASE.exportsAnnual -
    NATIONAL_ECONOMY_BASE.importsAnnual);

/** Net fiscal contribution per mature voter per year (abstract billions). */
export const MATURE_VOTER_NET_ANNUAL =
  POPULATION_TARGET_AT_REFERENCE / REFERENCE_REGISTERED_VOTERS;

/**
 * While a voter is "integrating", they are a small net drag (services, onboarding, eligibility).
 * Annualized rate for that window.
 */
export const INTEGRATION_DRAG_ANNUAL_PER_VOTER =
  ECONOMY_CONFIG.nationalEconomy.integrationDragAnnualPerVoter;

/** Days before they stop counting as a pure fiscal drag. */
export const INTEGRATION_PERIOD_DAYS =
  ECONOMY_CONFIG.nationalEconomy.integrationPeriodDays;

/** Days to ramp from 0 to full mature per-capita contribution after integration. */
export const INTEGRATION_RAMP_DAYS =
  ECONOMY_CONFIG.nationalEconomy.integrationRampDays;

const MS_PER_DAY = 86_400_000;

export type NationFiscalMultipliers = {
  fiscalTaxMultiplier: number;
  fiscalExportMultiplier: number;
  fiscalImportMultiplier: number;
};

const UNIT_MULTIPLIERS: NationFiscalMultipliers = {
  fiscalTaxMultiplier: 1,
  fiscalExportMultiplier: 1,
  fiscalImportMultiplier: 1,
};

export function staticAnnualRevenueNet(): number {
  return (
    NATIONAL_ECONOMY_BASE.taxesAnnual +
    NATIONAL_ECONOMY_BASE.exportsAnnual -
    NATIONAL_ECONOMY_BASE.importsAnnual
  );
}

export function tradeBalanceAnnual(): number {
  return (
    NATIONAL_ECONOMY_BASE.exportsAnnual - NATIONAL_ECONOMY_BASE.importsAnnual
  );
}

/**
 * One voter's net annualized contribution to the national envelope from tenure alone.
 */
export function voterAnnualFiscalContribution(
  createdAt: Date,
  now: Date,
): number {
  const days = Math.max(
    0,
    (now.getTime() - createdAt.getTime()) / MS_PER_DAY,
  );

  if (days < INTEGRATION_PERIOD_DAYS) {
    return INTEGRATION_DRAG_ANNUAL_PER_VOTER;
  }

  if (days < INTEGRATION_PERIOD_DAYS + INTEGRATION_RAMP_DAYS) {
    const rampProgress =
      (days - INTEGRATION_PERIOD_DAYS) / INTEGRATION_RAMP_DAYS;
    return MATURE_VOTER_NET_ANNUAL * rampProgress;
  }

  return MATURE_VOTER_NET_ANNUAL;
}

/** Split a non-negative integer total across `parts` buckets as evenly as possible. */
export function splitIntegerAcrossParts(
  total: number,
  parts: number,
): number[] {
  if (parts <= 0) return [];
  const safe = Math.max(0, Math.floor(total));
  const base = Math.floor(safe / parts);
  const rem = safe - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

export function fixedEnvelopeFields(mults: NationFiscalMultipliers) {
  const taxesAnnual =
    NATIONAL_ECONOMY_BASE.taxesAnnual * mults.fiscalTaxMultiplier;
  const exportsAnnual =
    NATIONAL_ECONOMY_BASE.exportsAnnual * mults.fiscalExportMultiplier;
  const importsAnnual =
    NATIONAL_ECONOMY_BASE.importsAnnual * mults.fiscalImportMultiplier;
  return {
    taxesAnnual,
    exportsAnnual,
    importsAnnual,
    staticRevenueNet: taxesAnnual + exportsAnnual - importsAnnual,
    tradeBalanceAnnual: exportsAnnual - importsAnnual,
  };
}

export function unitFixedEnvelopeFields() {
  return fixedEnvelopeFields(UNIT_MULTIPLIERS);
}
