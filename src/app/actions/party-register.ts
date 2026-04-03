"use server";

import { revalidatePath } from "next/cache";
import { getSession, refreshJwtSessionCookie } from "@/lib/auth";
import { resolveUserNationIdForSession } from "@/lib/ensure-user-nation-from-session";
import { PARTY_RANK_PM } from "@/lib/party-ranks";
import { prisma } from "@/lib/prisma";
import { isReservedPartySlug, slugifyPartySlug } from "@/lib/slug";

const DESC_MIN = 80;

export async function registerParty(input: {
  name: string;
  shortName: string;
  slugInput: string;
  accentColor: string;
  description: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) {
    return { ok: false, error: "Sign in as a voter first." };
  }

  const nationId = await resolveUserNationIdForSession(session);
  if (!nationId) {
    return {
      ok: false,
      error: "Choose a nation first (Account → your nation).",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) {
    return { ok: false, error: "Account not found." };
  }

  const owned = await prisma.party.findFirst({
    where: { ownerUserId: user.id },
  });
  if (owned) {
    return { ok: false, error: "You already manage a party." };
  }

  const memberOf = await prisma.partyMember.findUnique({
    where: { userId: user.id },
  });
  if (memberOf) {
    return {
      ok: false,
      error: "Leave your current party membership before founding a new party.",
    };
  }

  const slug = slugifyPartySlug(input.slugInput || input.shortName || input.name);
  if (!slug || isReservedPartySlug(slug)) {
    return { ok: false, error: "Choose a different URL slug." };
  }

  const taken = await prisma.party.findUnique({ where: { slug } });
  if (taken) {
    return { ok: false, error: "That slug is already taken." };
  }

  const name = input.name.trim();
  const shortName = input.shortName.trim() || name.slice(0, 24);
  if (name.length < 2) {
    return { ok: false, error: "Party name is too short." };
  }

  const description = input.description.trim();
  if (description.length < DESC_MIN) {
    return {
      ok: false,
      error: `Party description must be at least ${DESC_MIN} characters (platform & values).`,
    };
  }

  await prisma.$transaction(async (tx) => {
    const party = await tx.party.create({
      data: {
        slug,
        name,
        shortName,
        accentColor: input.accentColor.trim() || "#0d9488",
        isSystem: false,
        allowMemberJoin: true,
        ownerUserId: user.id,
        description,
      },
    });
    await tx.partyMember.create({
      data: {
        userId: user.id,
        partyId: party.id,
        rank: PARTY_RANK_PM,
      },
    });
  });

  const refreshed = await refreshJwtSessionCookie();
  if (!refreshed) {
    return { ok: false, error: "Could not refresh session." };
  }

  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath("/party");

  return { ok: true };
}
