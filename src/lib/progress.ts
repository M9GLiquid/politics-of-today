import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { SessionUser } from "@/types/game";
import { resolveUserNationIdForSession } from "@/lib/ensure-user-nation-from-session";
import { votingMonthLabel } from "@/lib/voting-month";
import { assertUserNotBannedOrMuted } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

const COOKIE = "pot_vote_progress";

function voteProgressCookieAttrs(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

/** For route handlers (logout): must set on Response for the browser to delete the cookie. */
export function clearVoteProgressCookieOnResponse(response: NextResponse): void {
  response.cookies.set(COOKIE, "", voteProgressCookieAttrs(0));
}

/** Clears month radar progress cookie only (server actions / Server Components). */
export async function clearVoteProgressCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, "", voteProgressCookieAttrs(0));
}

export type VoteProgress = {
  month: string;
  completedSlugs: string[];
  nationId?: string;
};

export function currentVotingMonth(): string {
  return votingMonthLabel();
}

export function yearFromVotingMonth(month: string): number {
  const y = Number.parseInt(month.slice(0, 4), 10);
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

function parse(raw: string | undefined): VoteProgress | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as {
      m?: string;
      slugs?: string[];
      nid?: string;
    };
    if (typeof data.m !== "string" || !Array.isArray(data.slugs)) return null;
    return {
      month: data.m,
      completedSlugs: data.slugs.filter((s) => typeof s === "string"),
      nationId: typeof data.nid === "string" ? data.nid : undefined,
    };
  } catch {
    return null;
  }
}

export async function getServerVoteProgress(
  sessionNationId?: string | null,
): Promise<VoteProgress> {
  const month = currentVotingMonth();
  const jar = await cookies();
  const parsed = parse(jar.get(COOKIE)?.value);
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

export async function setServerVoteProgress(
  progress: VoteProgress,
): Promise<void> {
  const jar = await cookies();
  const payload: { m: string; slugs: string[]; nid?: string } = {
    m: progress.month,
    slugs: progress.completedSlugs,
  };
  if (progress.nationId) payload.nid = progress.nationId;
  jar.set(
    COOKIE,
    JSON.stringify(payload),
    voteProgressCookieAttrs(60 * 60 * 24 * 40),
  );
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
    await setServerVoteProgress({
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
