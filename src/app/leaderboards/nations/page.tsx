import Link from "next/link";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{ page?: string }>;

const PAGE_SIZE = 30;

function parsePositiveInt(input: string | undefined): number {
  if (!input) return 1;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function formatWealth(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function NationLeaderboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page } = await searchParams;
  const requestedPage = parsePositiveInt(page);

  const total = await prisma.nation.count();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumber = Math.min(requestedPage, totalPages);
  const pageStart = (pageNumber - 1) * PAGE_SIZE;

  const rows = await prisma.nation.findMany({
    orderBy: [
      { accumulativeWealth: "desc" },
      { sortOrder: "asc" },
      { id: "asc" },
    ],
    skip: pageStart,
    take: PAGE_SIZE,
    select: {
      id: true,
      slug: true,
      name: true,
      accumulativeWealth: true,
    },
  });

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
          Nation wealth leaderboard
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Ranked by accumulative nation wealth (highest first).
        </p>
      </header>

      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-300">
            <tr>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Nation</th>
              <th className="px-3 py-2 text-right">Accumulative wealth</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-1.5 text-zinc-500">#{pageStart + i + 1}</td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/nations/${r.slug}`}
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-200">
                  {formatWealth(r.accumulativeWealth)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">No nations found.</p>
      ) : null}

      {total > 0 ? (
        <nav
          className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"
          aria-label="Nation leaderboard pagination"
        >
          <p className="text-zinc-500 dark:text-zinc-400">
            Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            {pageNumber > 1 ? (
              <Link
                href={`/leaderboards/nations?page=${pageNumber - 1}`}
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
                href={`/leaderboards/nations?page=${pageNumber + 1}`}
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
