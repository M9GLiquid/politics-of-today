"use server";

import { revalidatePath } from "next/cache";
import { requireGameAdminAccess } from "@/lib/game-admin-gate";
import { prisma } from "@/lib/prisma";

function hoursToMs(hours: number): number {
  return Math.round(hours * 60 * 60 * 1000);
}

export async function gameAdminBanUserAction(
  targetUserId: string,
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (targetUserId === gate.jwt.sub) {
    return { ok: false, error: "You cannot ban your own account." };
  }

  const exists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "User not found." };

  const trimmed =
    typeof reason === "string" ? reason.trim().slice(0, 2000) : "";
  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      bannedAt: new Date(),
      banReason: trimmed,
      mutedUntil: null,
    },
  });

  revalidatePath(`/admin/player/${targetUserId}`);
  revalidatePath("/parties");
  return { ok: true };
}

export async function gameAdminUnbanUserAction(
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const exists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "User not found." };

  await prisma.user.update({
    where: { id: targetUserId },
    data: { bannedAt: null, banReason: "" },
  });

  revalidatePath(`/admin/player/${targetUserId}`);
  return { ok: true };
}

export async function gameAdminMuteUserAction(
  targetUserId: string,
  hours: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (targetUserId === gate.jwt.sub) {
    return { ok: false, error: "You cannot mute your own account." };
  }

  const exists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "User not found." };

  const h = Number(hours);
  if (!Number.isFinite(h) || h <= 0 || h > 24 * 365) {
    return { ok: false, error: "Hours must be between 1 and 8760." };
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: { mutedUntil: new Date(Date.now() + hoursToMs(h)) },
  });

  revalidatePath(`/admin/player/${targetUserId}`);
  return { ok: true };
}

export async function gameAdminUnmuteUserAction(
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const exists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "User not found." };

  await prisma.user.update({
    where: { id: targetUserId },
    data: { mutedUntil: null },
  });

  revalidatePath(`/admin/player/${targetUserId}`);
  return { ok: true };
}

export async function gameAdminDeletePartyAction(
  partyId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, slug: true, isSystem: true },
  });
  if (!party) return { ok: false, error: "Party not found." };
  if (party.isSystem) return { ok: false, error: "System parties cannot be removed." };

  await prisma.party.delete({ where: { id: party.id } });

  revalidatePath("/parties");
  revalidatePath(`/parties/${party.slug}`);
  return { ok: true };
}
