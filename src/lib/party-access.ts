import { prisma } from "@/lib/prisma";

export type ResolvedPartyContext = {
  party: NonNullable<Awaited<ReturnType<typeof prisma.party.findUnique>>>;
  isOwner: boolean;
};

/** Party the user can open in Party desk: founded or joined as member. */
export async function resolveUserPartyDesk(
  userId: string,
): Promise<ResolvedPartyContext | null> {
  const owned = await prisma.party.findFirst({
    where: { ownerUserId: userId },
  });
  if (owned) {
    return { party: owned, isOwner: true };
  }
  const membership = await prisma.partyMember.findUnique({
    where: { userId },
    include: { Party: true },
  });
  if (membership) {
    return { party: membership.Party, isOwner: false };
  }
  return null;
}

export async function isPartyInsider(
  userId: string,
  partyId: string,
): Promise<boolean> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { ownerUserId: true },
  });
  if (!party) return false;
  if (party.ownerUserId === userId) return true;
  const m = await prisma.partyMember.findUnique({
    where: { userId },
    select: { partyId: true },
  });
  return m?.partyId === partyId;
}

export async function isPartyOwner(
  userId: string,
  partyId: string,
): Promise<boolean> {
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { ownerUserId: true },
  });
  return party?.ownerUserId === userId;
}
