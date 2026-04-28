import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import { currentCalendarYear, listNationsOrdered } from "@/lib/nations";
import { winningPolicyIdMapForNation } from "@/lib/db/active-law";

type SearchParams = Promise<{ page?: string }>;

const PAGE_SIZE = 30;

function parsePositiveInt(input: string | undefined): number {
  if (!input) return 1;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export default async function PartyAcceptedPoliciesLeaderboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page } = await searchParams;
  const requestedPage = parsePositiveInt(page);
  const year = currentCalendarYear();

  const [categories, nations, parties] = await Promise.all([
    listCategoriesOrdered(),
    listNationsOrdered(),
    prisma.party.findMany({
      where: { isSystem: false },
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        createdAt: true,
      },
    }),
  ]);

  const winnersByNation = await Promise.all(
    nations.map((n) => winningPolicyIdMapForNation(n.id, year, categories)),
  );

  const winnerIds = new Set<string>();
  for (const winners of winnersByNation) {
    for (const policyId of winners.values()) {
      winnerIds.add(policyId);
    }
  }

  const winnerPolicies =
    winnerIds.size > 0
      ? await prisma.partyPolicy.findMany({
          where: { id: { in: [...winnerIds] } },
          select: { id: true, partyId: true },
        })
      : [];

  const partyIdByPolicyId = new Map(winnerPolicies.map((p) => [p.id, p.partyId]));
  const acceptedCountByPartyId = new Map<string, number>();
  for (const party of parties) {
    acceptedCountByPartyId.set(party.id, 0);
  }

  for (const winners of winnersByNation) {
    for (const policyId of winners.values()) {
      const partyId = partyIdByPolicyId.get(policyId);
      if (!partyId) continue;
      acceptedCountByPartyId.set(
        partyId,
        (acceptedCountByPartyId.get(partyId) ?? 0) + 1,
      );
    }
  }

  const ranked = parties
    .map((p) => ({
      ...p,
      acceptedPolicies: acceptedCountByPartyId.get(p.id) ?? 0,
    }))
    .sort((a, b) => {
      const d = b.acceptedPolicies - a.acceptedPolicies;
      if (d !== 0) return d;
      const createdDelta = a.createdAt.getTime() - b.createdAt.getTime();
      if (createdDelta !== 0) return createdDelta;
      return a.id.localeCompare(b.id);
    });

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumber = Math.min(requestedPage, totalPages);
  const pageStart = (pageNumber - 1) * PAGE_SIZE;
  const paged = ranked.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-sans">
      <Link
        href="/leaderboards"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Leaderboards
      </Link>

      <header className="mt-4 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Party accepted-policy leaderboard
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Ranked by accepted policy slots in {year}. Slots are counted from each
          nation&apos;s winning policy per category.
        </p>
      </header>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Party</th>
              <th className="px-3 py-2 text-right">Accepted slots</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r, i) => (
              <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-1.5 text-zinc-500">#{pageStart + i + 1}</td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/parties/${r.slug}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-200">
                  {r.acceptedPolicies}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paged.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">No parties found.</p>
      ) : null}

      {total > 0 ? (
        <nav
          className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"
          aria-label="Party accepted policy leaderboard pagination"
        >
          <p className="text-zinc-500 dark:text-zinc-400">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {pageNumber > 1 ? (
              <Link
                href={`/leaderboards/parties?page=${pageNumber - 1}`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                Previous
              </span>
            )}
            <span className="text-zinc-600 dark:text-zinc-300">
              Page {pageNumber} of {totalPages}
            </span>
            {pageNumber < totalPages ? (
              <Link
                href={`/leaderboards/parties?page=${pageNumber + 1}`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                Next
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
