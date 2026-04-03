import type { UserRole } from "@/types/game";
import { prisma } from "@/lib/prisma";

export type NationDTO = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

/** True once the user has a nation and may pick a different one (new calendar year after last commit). */
export function canChangeNation(nationCommitYear: number | null): boolean {
  if (nationCommitYear === null) return true;
  return currentCalendarYear() > nationCommitYear;
}

/** Voters without a nation must complete selection before monthly votes count. */
export function voterNeedsNationPick(
  role: UserRole | undefined,
  nationId: string | null | undefined,
): boolean {
  return role === "voter" && !nationId;
}

export async function listNationsOrdered(): Promise<NationDTO[]> {
  const rows = await prisma.nation.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
    },
  });
  return rows;
}

export async function getNationBySlug(
  slug: string,
): Promise<NationDTO | null> {
  const row = await prisma.nation.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
    },
  });
  return row;
}

export async function getNationById(id: string): Promise<NationDTO | null> {
  const row = await prisma.nation.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      name: true,
      sortOrder: true,
    },
  });
  return row;
}
