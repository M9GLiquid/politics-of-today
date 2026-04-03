import { prisma } from "@/lib/prisma";
import { toGameCategory } from "@/lib/db/mappers";
import type { Category } from "@/types/game";

export async function listCategoriesOrdered(): Promise<Category[]> {
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toGameCategory);
}

export async function getCategoryBySlugDb(
  slug: string,
): Promise<Category | null> {
  const row = await prisma.category.findUnique({ where: { slug } });
  return row ? toGameCategory(row) : null;
}
