import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import * as jose from "jose";
import type { JWTPayload } from "jose";
import {
  applyAdminPreviewToSession,
  isDeveloperPreviewEnvironment,
  readAdminPreviewCookieState,
  userIsDeveloper,
} from "@/lib/admin-preview";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/game";

export const SESSION_COOKIE_NAME = "pot_session";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function sessionCookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

/** Route handlers must set cookies on the Response; `cookies().set()` alone often omits Set-Cookie. */
export function applySessionCookieToResponse(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieBase(),
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export function clearSessionCookieOnResponse(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieBase(),
    maxAge: 0,
  });
}

function getSecret(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 16) {
    return new TextEncoder().encode(secret);
  }
  if (process.env.NODE_ENV !== "production") {
    return new TextEncoder().encode("dev-insecure-secret-min-16");
  }
  return null;
}

/** False in production when AUTH_SECRET is missing or too short. */
export function canSignSessions(): boolean {
  return getSecret() !== null;
}

export async function signSession(user: SessionUser): Promise<string> {
  const secret = getSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET (16+ chars) required to sign sessions in production.");
  }
  const body: JWTPayload = {
    email: user.email,
    name: user.name,
    role: user.role,
    partyAffiliationLabel: user.partyAffiliationLabel,
  };
  if (user.partyId) body.partyId = user.partyId;
  if (user.nationId) body.nationId = user.nationId;
  if (user.nationSlug) body.nationSlug = user.nationSlug;
  if (user.nationName) body.nationName = user.nationName;
  if (user.nationCommitYear != null) {
    body.nationCommitYear = user.nationCommitYear;
  }
  if (user.playerCode) body.playerCode = user.playerCode;
  return new jose.SignJWT(body)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(
  token: string,
): Promise<SessionUser | null> {
  const secret = getSecret();
  if (!secret) return null;
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const name = typeof payload.name === "string" ? payload.name : "";
    // Legacy JWTs may have role "party"; permissions are voter + optional partyId.
    const role = "voter" as const;
    const partyId =
      typeof payload.partyId === "string" ? payload.partyId : undefined;
    const nationId =
      typeof payload.nationId === "string" ? payload.nationId : undefined;
    const nationSlug =
      typeof payload.nationSlug === "string" ? payload.nationSlug : undefined;
    const nationName =
      typeof payload.nationName === "string" ? payload.nationName : undefined;
    const nationCommitYearRaw = payload.nationCommitYear;
    const nationCommitYear =
      typeof nationCommitYearRaw === "number" &&
      Number.isFinite(nationCommitYearRaw)
        ? nationCommitYearRaw
        : undefined;
    const partyAffiliationLabelRaw = payload.partyAffiliationLabel;
    const partyAffiliationLabel =
      typeof partyAffiliationLabelRaw === "string"
        ? partyAffiliationLabelRaw
        : partyId
          ? "Member"
          : "Unaffiliated";
    const playerCode =
      typeof payload.playerCode === "string" ? payload.playerCode : undefined;
    if (!sub || !email) return null;
    return {
      sub,
      email,
      name,
      role,
      partyAffiliationLabel,
      playerCode,
      partyId,
      nationId,
      nationSlug,
      nationName,
      nationCommitYear,
    };
  } catch {
    return null;
  }
}

/**
 * Session from the login JWT only (no administrator preview / impersonation).
 * Use for permission checks that must refer to the real signed-in account.
 */
export async function getJwtSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;

  const userRow = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, bannedAt: true },
  });
  if (!userRow || userRow.bannedAt) {
    return null;
  }

  return session;
}

/**
 * Effective session for the request: JWT session plus optional developer preview
 * (session lens + impersonation / strip nation) when enabled and allowed.
 */
export async function getSession(): Promise<SessionUser | null> {
  const jwtSession = await getJwtSession();
  if (!jwtSession) return null;

  if (
    isDeveloperPreviewEnvironment() &&
    (await userIsDeveloper(jwtSession.sub, jwtSession.email))
  ) {
    const preview = await readAdminPreviewCookieState();
    const lens = preview.sessionLens;
    if (lens === "guest") return null;
    if (lens === "staff") return jwtSession;
  }

  return applyAdminPreviewToSession(jwtSession);
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieBase(),
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieBase(),
    maxAge: 0,
  });
}

/**
 * Re-issue the login JWT from the database for the **cookie owner** (not an impersonated user).
 * Call after mutations when preview mode may be active.
 */
export async function refreshJwtSessionCookie(): Promise<boolean> {
  const jwt = await getJwtSession();
  if (!jwt) return false;
  const next = await buildSessionUserForUserId(jwt.sub);
  if (!next) return false;
  const token = await signSession(next);
  await setSessionCookie(token);
  return true;
}
