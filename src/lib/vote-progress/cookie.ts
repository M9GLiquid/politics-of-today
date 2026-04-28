import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const VOTE_PROGRESS_COOKIE_NAME = "pot_vote_progress";

export type VoteProgressCookieState = {
  month: string;
  completedSlugs: string[];
  nationId?: string;
};

function voteProgressCookieAttrs(maxAgeSec: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export function parseVoteProgressCookie(
  raw: string | undefined,
): VoteProgressCookieState | null {
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

export function serializeVoteProgressCookie(
  progress: VoteProgressCookieState,
): string {
  const payload: { m: string; slugs: string[]; nid?: string } = {
    m: progress.month,
    slugs: progress.completedSlugs,
  };
  if (progress.nationId) payload.nid = progress.nationId;
  return JSON.stringify(payload);
}

export async function setVoteProgressCookie(
  progress: VoteProgressCookieState,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    VOTE_PROGRESS_COOKIE_NAME,
    serializeVoteProgressCookie(progress),
    voteProgressCookieAttrs(60 * 60 * 24 * 40),
  );
}

export async function clearVoteProgressCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(
    VOTE_PROGRESS_COOKIE_NAME,
    "",
    voteProgressCookieAttrs(0),
  );
}

/** For route handlers (logout): must set on Response for the browser to delete the cookie. */
export function clearVoteProgressCookieOnResponse(
  response: NextResponse,
): void {
  response.cookies.set(
    VOTE_PROGRESS_COOKIE_NAME,
    "",
    voteProgressCookieAttrs(0),
  );
}
