"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isPartyInsider, isPartyOwner } from "@/lib/party-access";
import { utcMonthKey } from "@/lib/party-months";
import {
  canAuthorPolicyDraft,
  resolvePartyMemberRank,
} from "@/lib/party-ranks";
import { prisma } from "@/lib/prisma";

export async function createPolicyDraft(input: {
  partyId: string;
  categoryId: string;
  catchPhrase: string;
  shortDescription: string;
  longDescription: string;
  budgetDeltaVsActive: number;
  monthsToComplete: number;
  taxNarrative: string;
  isContinuationOfStatusQuo: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const insider = await isPartyInsider(session.sub, input.partyId);
  if (!insider) return { ok: false, error: "Not a member of this party." };

  const rank = await resolvePartyMemberRank(session.sub, input.partyId);
  if (!canAuthorPolicyDraft(rank)) {
    return {
      ok: false,
      error: "Only the PM, Vice-PM, and council can create policy drafts.",
    };
  }

  const catchPhrase = input.catchPhrase.trim();
  if (catchPhrase.length < 2) {
    return { ok: false, error: "Add a short headline." };
  }

  const votingMonth = utcMonthKey();

  const draft = await prisma.partyPolicyDraft.create({
    data: {
      partyId: input.partyId,
      categoryId: input.categoryId,
      catchPhrase,
      shortDescription: input.shortDescription.trim(),
      longDescription: input.longDescription.trim(),
      budgetDeltaVsActive: input.budgetDeltaVsActive,
      monthsToComplete: Math.max(0, Math.round(input.monthsToComplete)),
      taxNarrative: input.taxNarrative.trim() || "—",
      isContinuationOfStatusQuo: input.isContinuationOfStatusQuo,
      createdByUserId: session.sub,
      draftVotingMonth: votingMonth,
    },
  });

  const party = await prisma.party.findUnique({ where: { id: input.partyId } });
  if (party) {
    revalidatePath("/party");
    revalidatePath(`/parties/${party.slug}`);
  }

  return { ok: true, id: draft.id };
}

export async function voteForDraft(
  draftId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const draft = await prisma.partyPolicyDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) return { ok: false, error: "Draft not found." };

  const insider = await isPartyInsider(session.sub, draft.partyId);
  if (!insider) return { ok: false, error: "Only party members can vote." };

  const rank = await resolvePartyMemberRank(session.sub, draft.partyId);
  if (canAuthorPolicyDraft(rank)) {
    return {
      ok: false,
      error: "PM, Vice-PM, and council vote through members only — ask a member to back your draft.",
    };
  }

  const month = utcMonthKey();
  if (draft.draftVotingMonth != null && draft.draftVotingMonth !== month) {
    return {
      ok: false,
      error: "This draft is not open for voting in the current month.",
    };
  }

  await prisma.partyDraftVote.upsert({
    where: {
      userId_partyId_categoryId_votingMonth: {
        userId: session.sub,
        partyId: draft.partyId,
        categoryId: draft.categoryId,
        votingMonth: month,
      },
    },
    create: {
      userId: session.sub,
      partyId: draft.partyId,
      categoryId: draft.categoryId,
      draftId: draft.id,
      votingMonth: month,
    },
    update: { draftId: draft.id },
  });

  const party = await prisma.party.findUnique({ where: { id: draft.partyId } });
  if (party) {
    revalidatePath("/party");
    revalidatePath(`/parties/${party.slug}`);
  }

  return { ok: true };
}

/**
 * Push draft to published PartyPolicy (same as founder emergency publish).
 * Caller must enforce access (party owner or admin dock).
 */
export async function publishDraftUnchecked(
  draftId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const draft = await prisma.partyPolicyDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) return { ok: false, error: "Draft not found." };

  const categorySlug = (
    await prisma.category.findUnique({
      where: { id: draft.categoryId },
      select: { slug: true },
    })
  )?.slug;

  const publishMonth = utcMonthKey();

  await prisma.$transaction([
    prisma.partyPolicy.upsert({
      where: {
        partyId_categoryId: {
          partyId: draft.partyId,
          categoryId: draft.categoryId,
        },
      },
      create: {
        partyId: draft.partyId,
        categoryId: draft.categoryId,
        catchPhrase: draft.catchPhrase,
        shortDescription: draft.shortDescription,
        longDescription: draft.longDescription,
        budgetDeltaVsActive: draft.budgetDeltaVsActive,
        monthsToComplete: draft.monthsToComplete,
        taxNarrative: draft.taxNarrative,
        isContinuationOfStatusQuo: draft.isContinuationOfStatusQuo,
        publishedMonth: publishMonth,
      },
      update: {
        catchPhrase: draft.catchPhrase,
        shortDescription: draft.shortDescription,
        longDescription: draft.longDescription,
        budgetDeltaVsActive: draft.budgetDeltaVsActive,
        monthsToComplete: draft.monthsToComplete,
        taxNarrative: draft.taxNarrative,
        isContinuationOfStatusQuo: draft.isContinuationOfStatusQuo,
        publishedMonth: publishMonth,
      },
    }),
    prisma.partyDraftVote.deleteMany({
      where: { partyId: draft.partyId, categoryId: draft.categoryId },
    }),
    prisma.partyPolicyDraft.deleteMany({
      where: { partyId: draft.partyId, categoryId: draft.categoryId },
    }),
  ]);

  const party = await prisma.party.findUnique({ where: { id: draft.partyId } });
  if (party) {
    revalidatePath("/party");
    revalidatePath(`/parties/${party.slug}`);
    if (categorySlug) {
      revalidatePath(`/categories/${categorySlug}`);
    }
  }

  return { ok: true };
}

/** Founder-only: push one draft live immediately (bypasses monthly tally). */
export async function publishDraft(
  draftId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const draft = await prisma.partyPolicyDraft.findUnique({
    where: { id: draftId },
  });
  if (!draft) return { ok: false, error: "Draft not found." };

  const owner = await isPartyOwner(session.sub, draft.partyId);
  if (!owner) {
    return { ok: false, error: "Only the founder can use emergency publish." };
  }

  return publishDraftUnchecked(draftId);
}
