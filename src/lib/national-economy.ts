import {
  REFERENCE_REGISTERED_VOTERS,
  nationalLedger,
} from "@/lib/data/ledger";
import { prisma } from "@/lib/prisma";

const MS_PER_DAY = 86_400_000;

/**
 * Annual fiscal model (abstract billions, same units as `nationalLedger.annualBudgetCap`).
 * Static hauls are base levels; each voter adds a tenure curve on top.
 */
export const NATIONAL_ECONOMY_BASE = {
  /** Domestic tax revenue before per-capita integration effects */
  taxesAnnual: 520,
  /** Export earnings (raises fiscal room) */
  exportsAnnual: 210,
  /** Import bill / outward leakage (reduces fiscal room vs exports) */
  importsAnnual: 185,
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
export const INTEGRATION_DRAG_ANNUAL_PER_VOTER = -0.00006;

/** Days before they stop counting as a pure fiscal drag. */
export const INTEGRATION_PERIOD_DAYS = 90;

/** Days to ramp from 0 to full mature per-capita contribution after integration. */
export const INTEGRATION_RAMP_DAYS = 270;

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

function parseEnvRegisteredVoterOverride(): number | null {
  const raw = process.env.REGISTERED_VOTER_COUNT;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Split a non-negative integer total across `parts` buckets as evenly as possible. */
function splitIntegerAcrossParts(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const safe = Math.max(0, Math.floor(total));
  const base = Math.floor(safe / parts);
  const rem = safe - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
}

export type NationalFiscalEnvelope = {
  totalAnnual: number;
  displayVoterCount: number;
  taxesAnnual: number;
  exportsAnnual: number;
  importsAnnual: number;
  staticRevenueNet: number;
  tradeBalanceAnnual: number;
  populationNetAnnual: number;
  /** True when envelope used REGISTERED_VOTER_COUNT (all voters treated as fully mature). */
  usedSyntheticVoterCount: boolean;
};

type EnvelopeFixed = Pick<
  NationalFiscalEnvelope,
  | "taxesAnnual"
  | "exportsAnnual"
  | "importsAnnual"
  | "staticRevenueNet"
  | "tradeBalanceAnnual"
>;

function fixedEnvelopeFields(mults: NationFiscalMultipliers): EnvelopeFixed {
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

function envelopeFromPopulationCount(
  fixed: EnvelopeFixed,
  displayVoterCount: number,
  usedSyntheticVoterCount: boolean,
): NationalFiscalEnvelope {
  const populationNetAnnual = displayVoterCount * MATURE_VOTER_NET_ANNUAL;
  const rawTotal = fixed.staticRevenueNet + populationNetAnnual;
  const totalAnnual = Math.max(1, rawTotal);
  return {
    ...fixed,
    totalAnnual,
    displayVoterCount,
    populationNetAnnual,
    usedSyntheticVoterCount,
  };
}

export type ComputeNationalEnvelopeOptions = {
  now?: Date;
  /**
   * When set, only voters in this nation contribute to the population term.
   * When omitted or null, all voters count (legacy combined envelope).
   */
  nationId?: string | null;
};

/**
 * Full annual envelope for radar denominator and copy.
 * `REGISTERED_VOTER_COUNT` skips DB tenure: N synthetic, fully mature voters split across nations when `nationId` is set.
 */
export async function computeNationalAnnualEnvelope(
  options?: ComputeNationalEnvelopeOptions,
): Promise<NationalFiscalEnvelope> {
  const now = options?.now ?? new Date();
  const nationId = options?.nationId ?? null;
  const fixed = fixedEnvelopeFields(UNIT_MULTIPLIERS);
  const envOverride = parseEnvRegisteredVoterOverride();

  if (envOverride !== null) {
    if (nationId) {
      const ordered = await prisma.nation.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true },
      });
      const counts = splitIntegerAcrossParts(envOverride, ordered.length);
      const idx = ordered.findIndex((r) => r.id === nationId);
      const count = idx >= 0 ? counts[idx]! : 0;
      return envelopeFromPopulationCount(fixed, count, true);
    }
    return envelopeFromPopulationCount(fixed, envOverride, true);
  }

  const voterWhere: { role: "VOTER"; nationId?: string } = { role: "VOTER" };
  if (nationId) voterWhere.nationId = nationId;

  const voters = await prisma.user.findMany({
    where: voterWhere,
    select: { createdAt: true },
  });
  const populationNetAnnual = voters.reduce(
    (sum, row) => sum + voterAnnualFiscalContribution(row.createdAt, now),
    0,
  );
  const rawTotal = fixed.staticRevenueNet + populationNetAnnual;
  const totalAnnual = Math.max(1, rawTotal);

  return {
    ...fixed,
    totalAnnual,
    displayVoterCount: voters.length,
    populationNetAnnual,
    usedSyntheticVoterCount: false,
  };
}

/**
 * One envelope per nation id, in the same order as `orderedNationIds`.
 * Single DB read for voters; synthetic override splits counts across nations by sort order.
 */
export async function computeNationalAnnualEnvelopesForOrderedNations(
  orderedNationIds: string[],
  now: Date = new Date(),
): Promise<NationalFiscalEnvelope[]> {
  const envOverride = parseEnvRegisteredVoterOverride();
  const n = orderedNationIds.length;

  if (n === 0) return [];

  const fixedBase = fixedEnvelopeFields(UNIT_MULTIPLIERS);

  if (envOverride !== null) {
    const counts = splitIntegerAcrossParts(envOverride, n);
    return orderedNationIds.map((_, i) =>
      envelopeFromPopulationCount(fixedBase, counts[i] ?? 0, true),
    );
  }

  const voters = await prisma.user.findMany({
    where: { role: "VOTER" },
    select: { createdAt: true, nationId: true },
  });

  const buckets = new Map<string, { createdAt: Date }[]>();
  for (const id of orderedNationIds) {
    buckets.set(id, []);
  }
  for (const v of voters) {
    if (v.nationId && buckets.has(v.nationId)) {
      buckets.get(v.nationId)!.push(v);
    }
  }

  return orderedNationIds.map((id) => {
    const subset = buckets.get(id) ?? [];
    const populationNetAnnual = subset.reduce(
      (sum, row) =>
        sum + voterAnnualFiscalContribution(row.createdAt, now),
      0,
    );
    const rawTotal = fixedBase.staticRevenueNet + populationNetAnnual;
    const totalAnnual = Math.max(1, rawTotal);
    return {
      ...fixedBase,
      totalAnnual,
      displayVoterCount: subset.length,
      populationNetAnnual,
      usedSyntheticVoterCount: false,
    };
  });
}
