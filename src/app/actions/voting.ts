"use server";

import { getSession } from "@/lib/auth";
import { appendCompletedCategory } from "@/lib/progress";
import { revalidatePath } from "next/cache";

export async function submitCategoryVote(
  categorySlug: string,
  partyPolicyId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const session = await getSession();
  const result = await appendCompletedCategory(
    session,
    categorySlug,
    partyPolicyId,
  );
  revalidatePath("/");
  revalidatePath("/nations");
  revalidatePath(`/categories/${categorySlug}`);
  return result;
}
