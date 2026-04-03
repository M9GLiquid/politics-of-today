import { prisma } from "@/lib/prisma";

export async function assertUserNotBannedOrMuted(
  userId: string,
): Promise<{ ok: true } | { ok: false; reason: "banned" | "muted" }> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { bannedAt: true, mutedUntil: true },
  });
  if (!row) return { ok: false, reason: "banned" };
  if (row.bannedAt) return { ok: false, reason: "banned" };
  if (row.mutedUntil != null && row.mutedUntil > new Date()) {
    return { ok: false, reason: "muted" };
  }
  return { ok: true };
}
