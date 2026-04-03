"use server";

import { revalidatePath } from "next/cache";
import { getSession, signSession, setSessionCookie } from "@/lib/auth";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import {
  canChangeNation,
  currentCalendarYear,
  getNationBySlug,
} from "@/lib/nations";
import { prisma } from "@/lib/prisma";

export async function changeNation(
  nationSlug: string,
): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "auth" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      nationId: true,
      nationCommitYear: true,
      role: true,
    },
  });
  if (!user) {
    return { ok: false, error: "auth" };
  }

  const nation = await getNationBySlug(nationSlug.trim());
  if (!nation) {
    return { ok: false, error: "invalid" };
  }

  const year = currentCalendarYear();

  if (user.nationId === null) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.sub },
        data: {
          nationId: nation.id,
          nationCommitYear: year,
        },
      }),
    ]);
  } else {
    if (user.nationId === nation.id) {
      const nextSame = await buildSessionUserForUserId(session.sub);
      if (nextSame) {
        const tokenSame = await signSession(nextSame);
        await setSessionCookie(tokenSame);
      }
      revalidatePath("/");
      revalidatePath("/parties");
      revalidatePath("/account/nation");
      revalidatePath("/nations");
      return { ok: true };
    }
    if (!canChangeNation(user.nationCommitYear)) {
      return { ok: false, error: "locked" };
    }
    await prisma.$transaction([
      prisma.partyUpvote.updateMany({
        where: { userId: session.sub },
        data: { nationId: nation.id },
      }),
      prisma.user.update({
        where: { id: session.sub },
        data: {
          nationId: nation.id,
          nationCommitYear: year,
        },
      }),
    ]);
  }

  const next = await buildSessionUserForUserId(session.sub);
  if (!next) {
    return { ok: false, error: "auth" };
  }
  const token = await signSession(next);
  await setSessionCookie(token);

  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath("/account/nation");
  revalidatePath("/nations");

  return { ok: true };
}

/**
 * Re-signs the session JWT from the database when it drifted (e.g. nation picked
 * but cookie still missing nationId). No-op when already in sync.
 */
export async function reconcileSessionCookie(): Promise<{ updated: boolean }> {
  const session = await getSession();
  if (!session) return { updated: false };

  const next = await buildSessionUserForUserId(session.sub);
  if (!next) return { updated: false };

  const inSync =
    session.nationId === next.nationId &&
    session.nationSlug === next.nationSlug &&
    (session.nationName ?? "") === (next.nationName ?? "") &&
    session.partyId === next.partyId &&
    session.partyAffiliationLabel === next.partyAffiliationLabel &&
    (session.playerCode ?? "") === (next.playerCode ?? "");

  if (inSync) return { updated: false };

  const token = await signSession(next);
  await setSessionCookie(token);
  return { updated: true };
}
