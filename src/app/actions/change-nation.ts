"use server";

import { revalidatePath } from "next/cache";
import {
  getJwtSession,
  getSession,
  refreshJwtSessionCookie,
} from "@/lib/auth";
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
      await refreshJwtSessionCookie();
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

  const refreshed = await refreshJwtSessionCookie();
  if (!refreshed) {
    return { ok: false, error: "auth" };
  }

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
  const jwt = await getJwtSession();
  if (!jwt) return { updated: false };

  const next = await buildSessionUserForUserId(jwt.sub);
  if (!next) return { updated: false };

  const inSync =
    jwt.nationId === next.nationId &&
    jwt.nationSlug === next.nationSlug &&
    (jwt.nationName ?? "") === (next.nationName ?? "") &&
    jwt.partyId === next.partyId &&
    jwt.partyAffiliationLabel === next.partyAffiliationLabel &&
    (jwt.playerCode ?? "") === (next.playerCode ?? "");

  if (inSync) return { updated: false };

  await refreshJwtSessionCookie();
  return { updated: true };
}
