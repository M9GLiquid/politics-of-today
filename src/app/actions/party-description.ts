"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { PARTY_RULES } from "@/lib/constants";
import { isPartyOwner } from "@/lib/party-access";
import { prisma } from "@/lib/prisma";

export async function updatePartyDescription(
  partyId: string,
  description: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const owner = await isPartyOwner(session.sub, partyId);
  if (!owner) {
    return { ok: false, error: "Only the founder can edit the party description." };
  }

  const text = description.trim();
  if (text.length < PARTY_RULES.descriptionMinLength) {
    return {
      ok: false,
      error: `Party description must be at least ${PARTY_RULES.descriptionMinLength} characters.`,
    };
  }

  const party = await prisma.party.update({
    where: { id: partyId },
    data: { description: text },
    select: { slug: true },
  });

  revalidatePath("/party");
  revalidatePath(`/parties/${party.slug}`);

  return { ok: true };
}
