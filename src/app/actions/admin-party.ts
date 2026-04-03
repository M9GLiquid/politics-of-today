"use server";

import { requireAdminDockAccess } from "@/lib/admin-dock-gate";
import { prisma } from "@/lib/prisma";
import { publishDraftUnchecked } from "@/app/actions/party-drafts";

export type AdminPartyDraftRow = {
  id: string;
  catchPhrase: string;
  categorySlug: string;
  categoryName: string;
  draftVotingMonth: string | null;
};

export async function adminListPartyDraftsAction(partyId: string): Promise<
  | { ok: true; drafts: AdminPartyDraftRow[] }
  | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const id = partyId.trim();
  if (!id) return { ok: false, error: "Pick a party." };

  const party = await prisma.party.findFirst({
    where: { id, isSystem: false },
    select: { id: true },
  });
  if (!party) return { ok: false, error: "Party not found." };

  const rows = await prisma.partyPolicyDraft.findMany({
    where: { partyId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      catchPhrase: true,
      draftVotingMonth: true,
      Category: { select: { slug: true, name: true } },
    },
  });

  return {
    ok: true,
    drafts: rows.map((r) => ({
      id: r.id,
      catchPhrase: r.catchPhrase,
      categorySlug: r.Category.slug,
      categoryName: r.Category.name,
      draftVotingMonth: r.draftVotingMonth,
    })),
  };
}

export async function adminPublishDraftAction(
  draftId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const id = draftId.trim();
  if (!id) return { ok: false, error: "Missing draft id." };

  return publishDraftUnchecked(id);
}
