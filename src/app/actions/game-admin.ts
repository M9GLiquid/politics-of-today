"use server";

import { requireAdminDockAccess } from "@/lib/admin-dock-gate";
import { requireGameAdminAccess } from "@/lib/game-admin-gate";
import { prisma } from "@/lib/prisma";

export type GameAdminUserCard = {
  id: string;
  displayName: string;
  email: string;
  publicCode: string;
  nationName: string | null;
  nationSlug: string | null;
  partyLabel: string | null;
  createdAt: string;
  hasDeveloperDock: boolean;
  hasGameAdminPanel: boolean;
  bannedAt: string | null;
  banReason: string | null;
  mutedUntil: string | null;
};

type UserRowForCard = {
  id: string;
  displayName: string;
  email: string;
  publicCode: string;
  isAdministrator: boolean;
  isGameAdministrator: boolean;
  createdAt: Date;
  bannedAt: Date | null;
  banReason: string;
  mutedUntil: Date | null;
  Nation: { name: string; slug: string } | null;
  Party: { name: string } | null;
  PartyMember: { Party: { name: string } } | null;
};

const userCardSelect = {
  id: true,
  displayName: true,
  email: true,
  publicCode: true,
  isAdministrator: true,
  isGameAdministrator: true,
  createdAt: true,
  bannedAt: true,
  banReason: true,
  mutedUntil: true,
  Nation: { select: { name: true, slug: true } },
  Party: { select: { name: true } },
  PartyMember: { select: { Party: { select: { name: true } } } },
} as const;

async function rowToCard(row: UserRowForCard): Promise<GameAdminUserCard> {
  let partyLabel: string | null = null;
  if (row.Party) partyLabel = `Founder · ${row.Party.name}`;
  else if (row.PartyMember) partyLabel = `Member · ${row.PartyMember.Party.name}`;

  const banReason =
    row.banReason && row.banReason.trim().length > 0 ? row.banReason : null;

  return {
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    publicCode: row.publicCode,
    nationName: row.Nation?.name ?? null,
    nationSlug: row.Nation?.slug ?? null,
    partyLabel,
    createdAt: row.createdAt.toISOString(),
    hasDeveloperDock: row.isAdministrator,
    hasGameAdminPanel: row.isGameAdministrator,
    bannedAt: row.bannedAt?.toISOString() ?? null,
    banReason,
    mutedUntil: row.mutedUntil?.toISOString() ?? null,
  };
}

export async function gameAdminLookupByEmailAction(email: string): Promise<
  | { ok: true; user: GameAdminUserCard }
  | { ok: false; error: string }
> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const normalized = email.trim().toLowerCase();
  if (normalized.length < 3) {
    return { ok: false, error: "Enter at least 3 characters." };
  }

  const row = await prisma.user.findUnique({
    where: { email: normalized },
    select: userCardSelect,
  });
  if (!row) return { ok: false, error: "No user with that email." };

  return { ok: true, user: await rowToCard(row) };
}

export async function gameAdminLookupByPublicCodeAction(
  code: string,
): Promise<{ ok: true; user: GameAdminUserCard } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const raw = code.trim().toLowerCase();
  const normalized = raw.startsWith("p-") ? raw : `p-${raw.replace(/^p-?/i, "")}`;

  if (normalized.length < 4) {
    return { ok: false, error: "Enter a public code (e.g. P-x7k2m9q1a)." };
  }

  const row = await prisma.user.findUnique({
    where: { publicCode: normalized },
    select: userCardSelect,
  });
  if (!row) return { ok: false, error: "No user with that public code." };

  return { ok: true, user: await rowToCard(row) };
}

export async function gameAdminGetUserByIdAction(
  userId: string,
): Promise<{ ok: true; user: GameAdminUserCard } | { ok: false; error: string }> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const row = await prisma.user.findUnique({
    where: { id: userId.trim() },
    select: userCardSelect,
  });
  if (!row) return { ok: false, error: "User not found." };

  return { ok: true, user: await rowToCard(row) };
}

export async function gameAdminSearchPlayersAction(query: string): Promise<
  | { ok: true; users: GameAdminUserCard[] }
  | { ok: false; error: string }
> {
  const gate = await requireGameAdminAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const q = query.trim();
  if (q.length < 2) {
    return { ok: false, error: "Enter at least 2 characters." };
  }

  const qLower = q.toLowerCase();
  const codeGuess = qLower.startsWith("p-") ? qLower : `p-${qLower.replace(/^p-?/i, "")}`;

  const rows = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: qLower } },
        { displayName: { contains: q } },
        { publicCode: { contains: codeGuess } },
      ],
    },
    select: userCardSelect,
    take: 25,
    orderBy: { createdAt: "desc" },
  });

  const users = await Promise.all(rows.map((r) => rowToCard(r)));
  return { ok: true, users };
}

/** Same lookups as game admin, gated for developers (Admin lens preview in dev dock). */
export async function developerSupportLookupByEmailAction(
  email: string,
): Promise<
  { ok: true; user: GameAdminUserCard } | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const normalized = email.trim().toLowerCase();
  if (normalized.length < 3) {
    return { ok: false, error: "Enter at least 3 characters." };
  }

  const row = await prisma.user.findUnique({
    where: { email: normalized },
    select: userCardSelect,
  });
  if (!row) return { ok: false, error: "No user with that email." };

  return { ok: true, user: await rowToCard(row) };
}

export async function developerSupportLookupByPublicCodeAction(
  code: string,
): Promise<{ ok: true; user: GameAdminUserCard } | { ok: false; error: string }> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const raw = code.trim().toLowerCase();
  const normalized = raw.startsWith("p-") ? raw : `p-${raw.replace(/^p-?/i, "")}`;

  if (normalized.length < 4) {
    return { ok: false, error: "Enter a public code (e.g. P-x7k2m9q1a)." };
  }

  const row = await prisma.user.findUnique({
    where: { publicCode: normalized },
    select: userCardSelect,
  });
  if (!row) return { ok: false, error: "No user with that public code." };

  return { ok: true, user: await rowToCard(row) };
}
