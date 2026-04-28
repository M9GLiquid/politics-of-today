import type { SessionUser } from "@/types/game";
import { cookies } from "next/headers";
import { resolveUserNationIdForSession } from "@/lib/ensure-user-nation-from-session";
import { votingMonthLabel } from "@/lib/voting-month";
import { assertUserNotBannedOrMuted } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import {
  VOTE_PROGRESS_COOKIE_NAME,
  parseVoteProgressCookie,
  setVoteProgressCookie,
  type VoteProgressCookieState,
} from "@/lib/vote-progress/cookie";

export type VoteProgress = VoteProgressCookieState;
export {
  clearVoteProgressCookie,
  clearVoteProgressCookieOnResponse,
} from "@/lib/vote-progress/cookie";

export function currentVotingMonth(): string {
  return votingMonthLabel();
}

export function yearFromVotingMonth(month: string): number {
  const y = Number.parseInt(month.slice(0, 4), 10);
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

export async function getServerVoteProgress(
  sessionNationId?: string | null,
): Promise<VoteProgress> {
  const month = currentVotingMonth();
  const jar = await cookies();
  const parsed = parseVoteProgressCookie(
    jar.get(VOTE_PROGRESS_COOKIE_NAME)?.value,
  );
  if (!parsed || parsed.month !== month) {
    return {
      month,
      completedSlugs: [],
      nationId: sessionNationId ?? undefined,
    };
  }
  if (sessionNationId && parsed.nationId !== sessionNationId) {
    return {
      month,
      completedSlugs: [],
      nationId: sessionNationId,
    };
  }
  return {
    month,
    completedSlugs: parsed.completedSlugs,
    nationId: parsed.nationId ?? sessionNationId ?? undefined,
  };
}

export async function appendCompletedCategory(
  session: SessionUser | null,
  slug: string,
  partyPolicyId: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!session) {
    return { ok: false, reason: "guest" };
  }
  const mod = await assertUserNotBannedOrMuted(session.sub);
  if (!mod.ok) {
    return { ok: false, reason: mod.reason === "muted" ? "muted" : "banned" };
  }
  const nationId = await resolveUserNationIdForSession(session);
  if (!nationId) {
    return { ok: false, reason: "nation" };
  }
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!category) {
    return { ok: false, reason: "category" };
  }
  const policyRow = await prisma.partyPolicy.findFirst({
    where: { id: partyPolicyId, categoryId: category.id },
    select: { id: true },
  });
  if (!policyRow) {
    return { ok: false, reason: "policy" };
  }

  const month = currentVotingMonth();
  const current = await getServerVoteProgress(nationId);
  const base =
    current.month === month && current.nationId === nationId
      ? current.completedSlugs.filter(Boolean)
      : [];
  if (!base.includes(slug)) {
    await setVoteProgressCookie({
      month,
      completedSlugs: [...base, slug],
      nationId,
    });
  }

  await prisma.userCategoryMonthVote.upsert({
    where: {
      userId_month_categorySlug: {
        userId: session.sub,
        month,
        categorySlug: slug,
      },
    },
    create: {
      userId: session.sub,
      nationId,
      year: yearFromVotingMonth(month),
      month,
      categorySlug: slug,
      partyPolicyId,
    },
    update: { partyPolicyId },
  });

  return { ok: true };
}
