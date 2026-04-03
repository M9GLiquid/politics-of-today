import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  currentCalendarYear,
  listNationsOrdered,
} from "@/lib/nations";

export default async function NationsPage() {
  const year = currentCalendarYear();
  const nations = await listNationsOrdered();

  const [voterCounts, voteCounts] = await Promise.all([
    prisma.user.groupBy({
      by: ["nationId"],
      where: { role: "VOTER", nationId: { not: null } },
      _count: { _all: true },
    }),
    prisma.userCategoryMonthVote.groupBy({
      by: ["nationId"],
      where: { year },
      _count: { _all: true },
    }),
  ]);

  const votersMap = new Map(
    voterCounts
      .filter((r) => r.nationId)
      .map((r) => [r.nationId as string, r._count._all]),
  );
  const votesMap = new Map(
    voteCounts.map((r) => [r.nationId, r._count._all]),
  );

  const rows = nations.map((n) => {
    const voters = votersMap.get(n.id) ?? 0;
    const completions = votesMap.get(n.id) ?? 0;
    const engagement =
      voters > 0 ? Math.round((completions / voters) * 100) / 100 : 0;
    return { ...n, voters, completions, engagement };
  });

  rows.sort((a, b) => {
    const d = b.completions - a.completions;
    if (d !== 0) return d;
    return b.voters - a.voters;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Nations
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Five nations compete each calendar year. Rankings here use{" "}
          <strong>{year}</strong> category votes logged by players in each nation
          (higher is more active participation). Finer “stability vs growth”
          scoring can layer on these totals later.
        </p>
      </header>

      <ol className="mt-8 flex flex-col gap-3">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div>
              <span className="text-zinc-400">#{i + 1}</span>{" "}
              <Link
                href={`/nations/${r.slug}`}
                className="font-semibold text-zinc-900 underline-offset-2 hover:text-teal-800 hover:underline dark:text-zinc-50 dark:hover:text-teal-300"
              >
                {r.name}
              </Link>
              <p className="mt-1 text-xs text-zinc-500">
                {r.voters} voter{r.voters === 1 ? "" : "s"} ·{" "}
                {r.completions} category-month vote
                {r.completions === 1 ? "" : "s"} this year ·{" "}
                {r.engagement.toFixed(1)} votes / voter (avg.)
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        <Link
          href="/account/nation"
          className="font-medium text-teal-700 underline dark:text-teal-400"
        >
          Manage your nation
        </Link>
      </p>
    </div>
  );
}
