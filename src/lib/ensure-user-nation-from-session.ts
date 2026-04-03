import { refreshJwtSessionCookie } from "@/lib/auth";
import { currentCalendarYear, getNationBySlug } from "@/lib/nations";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/types/game";

/**
 * Returns the voter's persisted nation id. If the JWT shows a nation slug but the DB row has no
 * nationId, persist from the session slug and refresh the session cookie.
 */
export async function resolveUserNationIdForSession(
  session: SessionUser,
): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { nationId: true, nationCommitYear: true },
  });
  if (!row) {
    return null;
  }
  if (row.nationId) {
    return row.nationId;
  }

  const slug = session.nationSlug?.trim();
  if (!slug) {
    return null;
  }

  const nation = await getNationBySlug(slug);
  if (!nation) {
    return null;
  }
  if (session.nationId && session.nationId !== nation.id) {
    return null;
  }

  await prisma.user.update({
    where: { id: session.sub },
    data: {
      nationId: nation.id,
      nationCommitYear: row.nationCommitYear ?? currentCalendarYear(),
    },
  });

  await refreshJwtSessionCookie();

  return nation.id;
}
