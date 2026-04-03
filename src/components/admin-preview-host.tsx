import { AdminPreviewDock } from "@/components/admin-preview-dock";
import { adminActiveLawSummaryForNation } from "@/lib/db/active-law";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import {
  isDeveloperPreviewEnvironment,
  listNationsForAdminDock,
  listPartiesForAdminDock,
  listUsersForAdminDock,
  readAdminPreviewCookieState,
  userIsDeveloper,
  type AdminDockEnvReadout,
  type AdminDockFiscalReadout,
  type AdminPreviewCookieState,
} from "@/lib/admin-preview";
import { getJwtSession, getSession } from "@/lib/auth";
import { computeNationalAnnualEnvelope } from "@/lib/national-economy";
import { utcMonthKey } from "@/lib/party-months";
import { currentVotingMonth, yearFromVotingMonth } from "@/lib/progress";

export async function AdminPreviewHost() {
  try {
    if (!isDeveloperPreviewEnvironment()) return null;

    const jwtSession = await getJwtSession();
    if (!jwtSession) return null;

    const allowed = await userIsDeveloper(jwtSession.sub, jwtSession.email);
    if (!allowed) return null;

    const [
      effectiveSession,
      cookieState,
      users,
      nations,
      parties,
      categories,
    ] = await Promise.all([
      getSession(),
      readAdminPreviewCookieState(),
      listUsersForAdminDock(),
      listNationsForAdminDock(),
      listPartiesForAdminDock(),
      listCategoriesOrdered(),
    ]);

    const month = currentVotingMonth();
    const year = yearFromVotingMonth(month);

    const envReadout: AdminDockEnvReadout = {
      utcMonth: utcMonthKey(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      registeredVoterOverride: Boolean(
        process.env.REGISTERED_VOTER_COUNT?.trim(),
      ),
    };

    const nationIdForReadouts = effectiveSession?.nationId ?? null;

    const [fiscalEnvelope, activeLawRows] = await Promise.all([
      computeNationalAnnualEnvelope(
        nationIdForReadouts ? { nationId: nationIdForReadouts } : {},
      ),
      adminActiveLawSummaryForNation(nationIdForReadouts, year, categories),
    ]);

    const fiscalScopeLabel =
      cookieState.sessionLens === "guest"
        ? "Guest lens — pages see logged-out UI; fiscal uses combined pool"
        : effectiveSession?.nationName
          ? `Nation: ${effectiveSession.nationName}`
          : "Combined pool (no nation on effective session)";

    const fiscalReadout: AdminDockFiscalReadout = {
      scopeLabel: fiscalScopeLabel,
      nationSlug: effectiveSession?.nationSlug ?? null,
      totalAnnual: fiscalEnvelope.totalAnnual,
      staticRevenueNet: fiscalEnvelope.staticRevenueNet,
      populationNetAnnual: fiscalEnvelope.populationNetAnnual,
      displayVoterCount: fiscalEnvelope.displayVoterCount,
      taxesAnnual: fiscalEnvelope.taxesAnnual,
      exportsAnnual: fiscalEnvelope.exportsAnnual,
      importsAnnual: fiscalEnvelope.importsAnnual,
    };

    const quickNationSlug =
      effectiveSession?.nationSlug ?? nations[0]?.slug ?? null;

    const categoriesNav = categories.map((c) => ({
      slug: c.slug,
      name: c.name,
    }));

    const initialCookie: AdminPreviewCookieState = cookieState;

    return (
      <AdminPreviewDock
        jwtSession={jwtSession}
        effectiveSession={effectiveSession}
        users={users}
        nations={nations}
        parties={parties}
        categoriesNav={categoriesNav}
        initialCookie={initialCookie}
        envReadout={envReadout}
        fiscalReadout={fiscalReadout}
        activeLawRows={activeLawRows}
        votingMonthLabel={month}
        activeLawYear={year}
        quickNationSlug={quickNationSlug}
      />
    );
  } catch (err) {
    console.error("[AdminPreviewHost]", err);
    return null;
  }
}
