import { prisma } from "@/lib/prisma";
import {
  MATURE_VOTER_NET_ANNUAL,
  splitIntegerAcrossParts,
  unitFixedEnvelopeFields,
  voterAnnualFiscalContribution,
} from "@/lib/national-economy/fiscal";

export {
  INTEGRATION_DRAG_ANNUAL_PER_VOTER,
  INTEGRATION_PERIOD_DAYS,
  INTEGRATION_RAMP_DAYS,
  MATURE_VOTER_NET_ANNUAL,
  NATIONAL_ECONOMY_BASE,
  type NationFiscalMultipliers,
  fixedEnvelopeFields,
  splitIntegerAcrossParts,
  staticAnnualRevenueNet,
  tradeBalanceAnnual,
  unitFixedEnvelopeFields,
  voterAnnualFiscalContribution,
} from "@/lib/national-economy/fiscal";

function parseEnvRegisteredVoterOverride(): number | null {
  const raw = process.env.REGISTERED_VOTER_COUNT;
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
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
  const fixed = unitFixedEnvelopeFields();
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

  const fixedBase = unitFixedEnvelopeFields();

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
