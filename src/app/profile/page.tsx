import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import {
  currentVotingMonth,
  getServerVoteProgress,
} from "@/lib/progress";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: {
      Nation: true,
      PartyUpvote: {
        include: {
          Party: {
            select: {
              id: true,
              slug: true,
              name: true,
              shortName: true,
              accentColor: true,
              isSystem: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      Party: {
        include: { _count: { select: { PartyUpvote: true } } },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const categories = await listCategoriesOrdered();
  const voteProgress = await getServerVoteProgress(user.nationId);
  const votingMonth = currentVotingMonth();
  const completedSet =
    voteProgress && voteProgress.month === votingMonth
      ? new Set(voteProgress.completedSlugs)
      : new Set<string>();
  const completedCount = categories.filter((c) =>
    completedSet.has(c.slug),
  ).length;
  const totalCategories = categories.length;

  const memberSince = user.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const visibleUpvotes = user.PartyUpvote.filter(
    (row) => !row.Party.isSystem,
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>

      <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {user.displayName}
          <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {session.partyAffiliationLabel}
          </span>
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
          {user.email}
        </p>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Member since {memberSince}
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Nation
        </h2>
        {user.Nation ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {user.Nation.name}
            </span>
            {user.nationCommitYear != null ? (
              <span className="text-zinc-500">
                {" "}
                · committed {user.nationCommitYear}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No nation selected yet. Choose one when you vote or register.
          </p>
        )}
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/account/nation"
            className="font-medium text-teal-700 underline dark:text-teal-400"
          >
            Change nation
          </Link>
        </p>
      </section>

      <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            This month&apos;s voting ({votingMonth})
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {completedCount} of {totalCategories} categories completed
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Month window: {votingMonth} (UTC). Progress is stored per month.
          </p>
          {categories.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {categories.map((c) => {
                const done = completedSet.has(c.slug);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/categories/${c.slug}`}
                      className={
                        done
                          ? "text-teal-700 underline dark:text-teal-400"
                          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      }
                    >
                      {done ? "✓ " : "○ "}
                      {c.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>

      <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Party upvotes
          </h2>
          {visibleUpvotes.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              You have not upvoted any parties yet.{" "}
              <Link
                href="/parties"
                className="font-medium text-teal-700 underline dark:text-teal-400"
              >
                Browse parties
              </Link>
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {visibleUpvotes.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/parties/${row.Party.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <span
                      className="h-10 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: row.Party.accentColor }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {row.Party.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {row.Party.shortName} · View party profile →
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

      {user.Party ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Your party
          </h2>
          <div
            className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            style={{
              borderLeftWidth: 4,
              borderLeftColor: user.Party.accentColor,
            }}
          >
            <div className="p-4">
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {user.Party.name}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {user.Party.shortName}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {user.Party._count.PartyUpvote} upvotes (global)
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/parties/${user.Party.slug}`}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
                >
                  Public party profile
                </Link>
                <Link
                  href="/party"
                  className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white dark:bg-teal-500"
                >
                  Party desk
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
