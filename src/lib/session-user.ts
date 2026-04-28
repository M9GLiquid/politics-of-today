import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/game";
import {
  formatPartyRankForDisplay,
  resolvePartyMemberRank,
} from "@/lib/party-ranks";

export async function buildSessionUserForUserId(
  userId: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { Nation: { select: { slug: true, name: true } } },
  });
  if (!user || user.bannedAt) return null;
  const owned = await prisma.party.findFirst({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  const membership = await prisma.partyMember.findUnique({
    where: { userId: user.id },
    select: { partyId: true },
  });
  const partyId = owned?.id ?? membership?.partyId;
  let partyAffiliationLabel = "Unaffiliated";
  if (partyId) {
    const rank = await resolvePartyMemberRank(user.id, partyId);
    partyAffiliationLabel = rank
      ? formatPartyRankForDisplay(rank)
      : "Member";
  }
  return {
    sub: user.id,
    email: user.email,
    name: user.displayName,
    role: "voter",
    partyAffiliationLabel,
    playerCode: user.publicCode,
    partyId,
    nationId: user.nationId ?? undefined,
    nationSlug: user.Nation?.slug,
    nationName: user.Nation?.name,
    nationCommitYear: user.nationCommitYear ?? undefined,
  };
}
