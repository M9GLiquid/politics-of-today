"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { resolveUserNationIdForSession } from "@/lib/ensure-user-nation-from-session";
import { assertUserNotBannedOrMuted } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function togglePartyUpvote(
  partyId: string,
): Promise<
  | { ok: true; upvoted: boolean; count: number }
  | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "auth" };
  }

  const mod = await assertUserNotBannedOrMuted(session.sub);
  if (!mod.ok) {
    return {
      ok: false,
      error:
        mod.reason === "muted" ? "muted" : "Your account cannot perform this action.",
    };
  }

  const nationId = await resolveUserNationIdForSession(session);
  if (!nationId) {
    return { ok: false, error: "nation" };
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.isSystem) {
    return { ok: false, error: "invalid" };
  }

  const existing = await prisma.partyUpvote.findUnique({
    where: {
      userId_partyId: { userId: session.sub, partyId },
    },
  });

  let upvoted: boolean;
  if (existing) {
    await prisma.partyUpvote.delete({ where: { id: existing.id } });
    upvoted = false;
  } else {
    await prisma.partyUpvote.create({
      data: {
        userId: session.sub,
        partyId,
        nationId,
      },
    });
    upvoted = true;
  }

  const count = await prisma.partyUpvote.count({
    where: { partyId, nationId },
  });

  revalidatePath("/parties");
  revalidatePath(`/parties/${party.slug}`);
  revalidatePath("/profile");
  revalidatePath("/");

  return { ok: true, upvoted, count };
}
