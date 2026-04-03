"use server";

import { cookies } from "next/headers";
import {
  clearSessionCookie,
  getSession,
  readSessionToken,
  SESSION_COOKIE_NAME,
  signSession,
  setSessionCookie,
} from "@/lib/auth";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";
import { clearVoteProgressCookie } from "@/lib/progress";

/**
 * Clears pot_session when the JWT verifies but no User row exists (allowed in Server Actions only).
 */
export async function purgeOrphanSessionCookie(): Promise<{ purged: boolean }> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return { purged: false };
  }
  const fromJwt = await readSessionToken(token);
  if (!fromJwt) {
    return { purged: false };
  }
  const row = await prisma.user.findUnique({
    where: { id: fromJwt.sub },
    select: { id: true },
  });
  if (row) {
    return { purged: false };
  }
  await clearSessionCookie();
  return { purged: true };
}

/** Re-issue JWT from the database (fixes stale claims; resets 7-day expiry). */
export async function refreshSessionFromDatabase(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "not_signed_in" };
  }
  const next = await buildSessionUserForUserId(session.sub);
  if (!next) {
    return { ok: false, error: "no_user" };
  }
  const token = await signSession(next);
  await setSessionCookie(token);
  return { ok: true };
}

/** Clears the httpOnly vote-progress cookie for this browser only. */
export async function clearVoteProgressForDevice(): Promise<{ ok: true }> {
  await clearVoteProgressCookie();
  return { ok: true };
}
