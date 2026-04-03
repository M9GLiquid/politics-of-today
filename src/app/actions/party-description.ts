"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isPartyOwner } from "@/lib/party-access";
import { prisma } from "@/lib/prisma";

const MIN_LEN = 80;

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
  if (text.length < MIN_LEN) {
    return {
      ok: false,
      error: `Party description must be at least ${MIN_LEN} characters.`,
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
