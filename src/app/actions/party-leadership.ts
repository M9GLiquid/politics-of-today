"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isPartyInsider } from "@/lib/party-access";
import { leadershipPeriodKey } from "@/lib/party-months";
import {
  MAX_COUNCIL_VOTES_PER_VOTER,
  PARTY_RANK_MEMBER,
  PARTY_RANK_PM,
  resolvePartyMemberRank,
} from "@/lib/party-ranks";
import { prisma } from "@/lib/prisma";

async function assertCandidateInParty(
  partyId: string,
  candidateUserId: string,
): Promise<boolean> {
  const row = await prisma.partyMember.findUnique({
    where: { userId: candidateUserId },
    select: { partyId: true },
  });
  return row?.partyId === partyId;
}

export async function voteLeadershipOffice(input: {
  partyId: string;
  office: "PM" | "VICE_PM";
  candidateUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const insider = await isPartyInsider(session.sub, input.partyId);
  if (!insider) return { ok: false, error: "Only party members can vote." };

  const rank = await resolvePartyMemberRank(session.sub, input.partyId);
  if (rank !== PARTY_RANK_MEMBER) {
    return { ok: false, error: "Only rank-and-file members vote in leadership elections." };
  }

  const okCand = await assertCandidateInParty(input.partyId, input.candidateUserId);
  if (!okCand) {
    return { ok: false, error: "Candidate must be a member of this party." };
  }

  const periodKey = leadershipPeriodKey();

  await prisma.partyOfficeLeadershipVote.upsert({
    where: {
      voterUserId_partyId_periodKey_office: {
        voterUserId: session.sub,
        partyId: input.partyId,
        periodKey,
        office: input.office,
      },
    },
    create: {
      partyId: input.partyId,
      periodKey,
      office: input.office,
      voterUserId: session.sub,
      candidateUserId: input.candidateUserId,
    },
    update: { candidateUserId: input.candidateUserId },
  });

  const party = await prisma.party.findUnique({ where: { id: input.partyId } });
  if (party) {
    revalidatePath("/party");
    revalidatePath(`/parties/${party.slug}`);
  }

  return { ok: true };
}

export async function toggleCouncilLeadershipVote(input: {
  partyId: string;
  candidateUserId: string;
}): Promise<{ ok: true; selected: boolean } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const insider = await isPartyInsider(session.sub, input.partyId);
  if (!insider) return { ok: false, error: "Only party members can vote." };

  const rank = await resolvePartyMemberRank(session.sub, input.partyId);
  if (rank !== PARTY_RANK_MEMBER) {
    return { ok: false, error: "Only rank-and-file members vote in leadership elections." };
  }

  const okCand = await assertCandidateInParty(input.partyId, input.candidateUserId);
  if (!okCand) {
    return { ok: false, error: "Candidate must be a member of this party." };
  }

  const periodKey = leadershipPeriodKey();

  const existing = await prisma.partyCouncilLeadershipVote.findUnique({
    where: {
      voterUserId_partyId_periodKey_candidateUserId: {
        voterUserId: session.sub,
        partyId: input.partyId,
        periodKey,
        candidateUserId: input.candidateUserId,
      },
    },
  });

  if (existing) {
    await prisma.partyCouncilLeadershipVote.delete({ where: { id: existing.id } });
    const party = await prisma.party.findUnique({ where: { id: input.partyId } });
    if (party) {
      revalidatePath("/party");
      revalidatePath(`/parties/${party.slug}`);
    }
    return { ok: true, selected: false };
  }

  const count = await prisma.partyCouncilLeadershipVote.count({
    where: { voterUserId: session.sub, partyId: input.partyId, periodKey },
  });
  if (count >= MAX_COUNCIL_VOTES_PER_VOTER) {
    return {
      ok: false,
      error: `You can only endorse up to ${MAX_COUNCIL_VOTES_PER_VOTER} council candidates.`,
    };
  }

  await prisma.partyCouncilLeadershipVote.create({
    data: {
      partyId: input.partyId,
      periodKey,
      voterUserId: session.sub,
      candidateUserId: input.candidateUserId,
    },
  });

  const party = await prisma.party.findUnique({ where: { id: input.partyId } });
  if (party) {
    revalidatePath("/party");
    revalidatePath(`/parties/${party.slug}`);
  }

  return { ok: true, selected: true };
}

export async function transferPartyPm(input: {
  partyId: string;
  newPmUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const party = await prisma.party.findUnique({
    where: { id: input.partyId },
    select: { ownerUserId: true, slug: true },
  });
  if (!party) return { ok: false, error: "Party not found." };

  const actorRank = await resolvePartyMemberRank(session.sub, input.partyId);
  const isFounder = party.ownerUserId === session.sub;
  if (actorRank !== PARTY_RANK_PM && !isFounder) {
    return { ok: false, error: "Only the PM or founder can transfer the PM role." };
  }

  if (input.newPmUserId === session.sub) {
    return { ok: false, error: "Pick another member as PM." };
  }

  const target = await prisma.partyMember.findUnique({
    where: { userId: input.newPmUserId },
  });
  if (!target || target.partyId !== input.partyId) {
    return { ok: false, error: "New PM must be an existing party member." };
  }

  const actorMember = await prisma.partyMember.findUnique({
    where: { userId: session.sub },
  });

  await prisma.$transaction(async (tx) => {
    await tx.partyMember.update({
      where: { userId: input.newPmUserId },
      data: { rank: PARTY_RANK_PM },
    });
    if (actorMember && actorMember.partyId === input.partyId) {
      await tx.partyMember.update({
        where: { userId: session.sub },
        data: { rank: PARTY_RANK_MEMBER },
      });
    }
  });

  revalidatePath("/party");
  revalidatePath(`/parties/${party.slug}`);

  return { ok: true };
}
