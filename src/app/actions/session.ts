"use server";

import { cookies } from "next/headers";
import {
  clearSessionCookie,
  readSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
