import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/game";

/**
 * Developer dock (session lens + impersonation) — dev / staging only.
 *
 * - Keep `ADMIN_PREVIEW_ENABLED` unset (or not "true") on production main — the dock
 *   and impersonation logic no-op even if `User.isAdministrator` is true.
 * - Game staff use `GAME_ADMIN_UI_ENABLED` + `User.isGameAdministrator` (separate panel).
 */
export const ADMIN_PREVIEW_COOKIE_NAME = "pot_admin_preview";

const PREVIEW_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/** Developer-only: how `getSession()` behaves while your JWT stays signed in. */
export type DeveloperSessionLens = "guest" | "user" | "staff";

export type AdminPreviewCookieState = {
  sessionLens: DeveloperSessionLens;
  impersonateUserId: string | null;
  stripNation: boolean;
};

export type AdminPreviewUserOption = {
  id: string;
  label: string;
  kind: string;
  nationLabel: string;
  nationSlug: string | null;
  createdAt: string;
};

export type AdminDockEnvReadout = {
  utcMonth: string;
  nodeEnv: string;
  registeredVoterOverride: boolean;
};

export type AdminDockFiscalReadout = {
  scopeLabel: string;
  nationSlug: string | null;
  totalAnnual: number;
  staticRevenueNet: number;
  populationNetAnnual: number;
  displayVoterCount: number;
  taxesAnnual: number;
  exportsAnnual: number;
  importsAnnual: number;
};

export type AdminPreviewNationOption = {
  id: string;
  slug: string;
  name: string;
};

export type AdminPreviewPartyOption = {
  id: string;
  slug: string;
  name: string;
};

function adminPreviewCookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function isAdminPreviewEnabled(): boolean {
  const v = process.env.ADMIN_PREVIEW_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * When true, developer-dock code paths may run. Production still requires
 * `ADMIN_PREVIEW_ENABLED`; local `next dev` does not (NODE_ENV=development).
 */
export function isDeveloperPreviewEnvironment(): boolean {
  if (isAdminPreviewEnabled()) return true;
  return process.env.NODE_ENV !== "production";
}

/** Enables the floating **game admin** panel (support tools, no session simulation). */
export function isGameAdminUiEnabled(): boolean {
  const v = process.env.GAME_ADMIN_UI_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function adminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(parts);
}

/** Developer dock + dangerous tools (non-prod OR `ADMIN_PREVIEW_ENABLED`, plus DB or email allowlist). */
export async function userIsDeveloper(
  userId: string,
  email: string,
): Promise<boolean> {
  if (!isDeveloperPreviewEnvironment()) return false;
  if (adminEmailAllowlist().has(email.trim().toLowerCase())) return true;
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdministrator: true },
    });
    return row?.isAdministrator === true;
  } catch (err) {
    console.error(
      "[admin-preview] userIsDeveloper (run prisma migrate / generate if schema drifted)",
      err,
    );
    return false;
  }
}

/** @deprecated use `userIsDeveloper` */
export const userIsAdministrator = userIsDeveloper;

/** Game admin panel only — cannot use session lens or impersonation. */
export async function userIsGameAdministrator(
  userId: string,
  _email: string,
): Promise<boolean> {
  if (!isGameAdminUiEnabled()) return false;
  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { isGameAdministrator: true },
    });
    return row?.isGameAdministrator === true;
  } catch (err) {
    console.error("[admin-preview] userIsGameAdministrator", err);
    return false;
  }
}

function normalizeSessionLens(raw: unknown): DeveloperSessionLens {
  if (raw === "guest" || raw === "staff") return raw;
  return "user";
}

export function parseAdminPreviewCookie(
  raw: string | undefined,
): AdminPreviewCookieState {
  const empty: AdminPreviewCookieState = {
    sessionLens: "user",
    impersonateUserId: null,
    stripNation: false,
  };
  if (!raw) {
    return empty;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return empty;
    }
    const o = data as Record<string, unknown>;
    const imp =
      typeof o.impersonateUserId === "string" && o.impersonateUserId.length > 0
        ? o.impersonateUserId
        : null;
    const strip = o.stripNation === true;
    return {
      sessionLens: normalizeSessionLens(o.sessionLens),
      impersonateUserId: imp,
      stripNation: strip,
    };
  } catch {
    return empty;
  }
}

export async function readAdminPreviewCookieState(): Promise<AdminPreviewCookieState> {
  const jar = await cookies();
  return parseAdminPreviewCookie(jar.get(ADMIN_PREVIEW_COOKIE_NAME)?.value);
}

function stripNationFromSession(session: SessionUser): SessionUser {
  const next: SessionUser = {
    ...session,
    nationId: undefined,
    nationSlug: undefined,
    nationName: undefined,
    nationCommitYear: undefined,
  };
  return next;
}

export async function applyAdminPreviewToSession(
  jwtSession: SessionUser,
): Promise<SessionUser> {
  if (!isDeveloperPreviewEnvironment()) return jwtSession;

  const allowed = await userIsDeveloper(jwtSession.sub, jwtSession.email);
  if (!allowed) return jwtSession;

  const state = await readAdminPreviewCookieState();
  if (state.sessionLens !== "user") return jwtSession;

  if (!state.impersonateUserId && !state.stripNation) return jwtSession;

  const meta = {
    realSub: jwtSession.sub,
    realEmail: jwtSession.email,
  };

  if (state.impersonateUserId) {
    const built = await buildSessionUserForUserId(state.impersonateUserId);
    if (!built) return jwtSession;
    const effective = state.stripNation
      ? stripNationFromSession(built)
      : built;
    return { ...effective, adminMeta: meta };
  }

  if (state.stripNation) {
    return {
      ...stripNationFromSession(jwtSession),
      adminMeta: meta,
    };
  }

  return jwtSession;
}

export async function setAdminPreviewCookieState(
  state: AdminPreviewCookieState,
): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_PREVIEW_COOKIE_NAME, JSON.stringify(state), {
    ...adminPreviewCookieBase(),
    maxAge: PREVIEW_MAX_AGE_SEC,
  });
}

export async function clearAdminPreviewCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_PREVIEW_COOKIE_NAME, "", {
    ...adminPreviewCookieBase(),
    maxAge: 0,
  });
}

export function clearAdminPreviewCookieOnResponse(response: NextResponse): void {
  response.cookies.set(ADMIN_PREVIEW_COOKIE_NAME, "", {
    ...adminPreviewCookieBase(),
    maxAge: 0,
  });
}

export async function listPartiesForAdminDock(): Promise<AdminPreviewPartyOption[]> {
  try {
    return await prisma.party.findMany({
      where: { isSystem: false },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    });
  } catch (err) {
    console.error("[admin-preview] listPartiesForAdminDock", err);
    return [];
  }
}

export async function listNationsForAdminDock(): Promise<AdminPreviewNationOption[]> {
  try {
    return await prisma.nation.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true },
    });
  } catch (err) {
    console.error("[admin-preview] listNationsForAdminDock", err);
    return [];
  }
}

export async function listUsersForAdminDock(): Promise<AdminPreviewUserOption[]> {
  try {
    const rows = await prisma.user.findMany({
      take: 300,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        Party: {
          select: { name: true },
        },
        PartyMember: {
          select: { Party: { select: { name: true } } },
        },
        Nation: { select: { name: true, slug: true } },
      },
    });

    return rows.map((r) => {
      let kind = "Voter";
      if (r.Party) kind = `Founder · ${r.Party.name}`;
      else if (r.PartyMember) kind = `Member · ${r.PartyMember.Party.name}`;
      return {
        id: r.id,
        label: `${r.displayName} · ${r.email}`,
        kind,
        nationLabel: r.Nation?.name ?? "—",
        nationSlug: r.Nation?.slug ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  } catch (err) {
    console.error("[admin-preview] listUsersForAdminDock", err);
    return [];
  }
}
