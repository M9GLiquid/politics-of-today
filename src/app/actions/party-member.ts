"use server";

import { revalidatePath } from "next/cache";
import { getSession, setSessionCookie, signSession } from "@/lib/auth";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import { resolveUserNationIdForSession } from "@/lib/ensure-user-nation-from-session";
import { isPartyOwner } from "@/lib/party-access";
import { prisma } from "@/lib/prisma";

export async function joinParty(
  partyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const nationId = await resolveUserNationIdForSession(session);
  if (!nationId) {
    return { ok: false, error: "Pick a nation first (Account)." };
  }

  const owned = await prisma.party.findFirst({
    where: { ownerUserId: session.sub },
  });
  if (owned) {
    return {
      ok: false,
      error:
        "You founded a party — use Party desk to run it. Founders cannot join another party as a member.",
    };
  }

  const existing = await prisma.partyMember.findUnique({
    where: { userId: session.sub },
  });
  if (existing) {
    return { ok: false, error: "You already belong to a party. Leave it first." };
  }

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.isSystem || !party.allowMemberJoin) {
    return { ok: false, error: "This party is not open for new members." };
  }

  await prisma.partyMember.create({
    data: { userId: session.sub, partyId, rank: "MEMBER" },
  });

  const nextSession = await buildSessionUserForUserId(session.sub);
  if (nextSession) {
    const token = await signSession(nextSession);
    await setSessionCookie(token);
  }

  revalidatePath("/parties");
  revalidatePath(`/parties/${party.slug}`);
  revalidatePath("/party");
  revalidatePath("/profile");

  return { ok: true };
}

export async function leaveParty(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const row = await prisma.partyMember.findUnique({
    where: { userId: session.sub },
    include: { Party: true },
  });
  if (!row) {
    return { ok: false, error: "You are not a party member." };
  }

  if (row.rank === "PM") {
    return {
      ok: false,
      error: "Transfer the PM role before leaving the party.",
    };
  }

  await prisma.partyMember.delete({ where: { id: row.id } });

  const nextSession = await buildSessionUserForUserId(session.sub);
  if (nextSession) {
    const token = await signSession(nextSession);
    await setSessionCookie(token);
  }

  revalidatePath("/parties");
  revalidatePath(`/parties/${row.Party.slug}`);
  revalidatePath("/party");
  revalidatePath("/profile");

  return { ok: true };
}

export async function toggleAllowMemberJoin(
  partyId: string,
  nextValue: boolean,
): Promise<{ ok: true; allowMemberJoin: boolean } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const owner = await isPartyOwner(session.sub, partyId);
  if (!owner) return { ok: false, error: "Only the party founder can change this." };

  const party = await prisma.party.update({
    where: { id: partyId },
    data: { allowMemberJoin: nextValue },
  });

  revalidatePath("/party");
  revalidatePath(`/parties/${party.slug}`);

  return { ok: true, allowMemberJoin: party.allowMemberJoin };
}
