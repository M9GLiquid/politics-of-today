import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canChangeNation, listNationsOrdered } from "@/lib/nations";
import { prisma } from "@/lib/prisma";
import { NationPickForm } from "./nation-pick-form";

export default async function AccountNationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/account/nation");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      nationId: true,
      nationCommitYear: true,
      Nation: { select: { name: true, slug: true } },
    },
  });

  const nations = await listNationsOrdered();
  const needsPick = !user?.nationId;
  const unlocked =
    user?.nationId != null && canChangeNation(user.nationCommitYear);

  return (
    <div className="mx-auto max-w-lg px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Your nation
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        You compete with your nation for the full calendar year (12 monthly
        rounds). Party rankings and policy ballots use{" "}
        <strong>only upvotes from players in the same nation</strong>. You can
        switch nation once per year, after the calendar year of your last choice
        has ended.
      </p>

      {user?.Nation ? (
        <p className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {user.Nation.name}
          </span>
          <span className="mt-1 block text-zinc-500">
            Slug <code className="text-zinc-700 dark:text-zinc-300">/{user.Nation.slug}</code>
          </span>
        </p>
      ) : (
        <p className="mt-6 text-sm font-medium text-amber-800 dark:text-amber-200">
          Choose a nation to unlock voting that counts for your team.
        </p>
      )}

      {needsPick || unlocked ? (
        <NationPickForm
          nations={nations}
          currentSlug={user?.Nation?.slug ?? null}
          isInitialPick={needsPick}
        />
      ) : null}

      {!needsPick && !unlocked && user?.nationId ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Nation change unlocks on January 1 after the year you last confirmed
          your nation ({user.nationCommitYear ?? "—"}).
        </p>
      ) : null}

      <p className="mt-8 text-sm">
        <Link
          href="/nations"
          className="font-medium text-teal-700 underline dark:text-teal-400"
        >
          Year standings →
        </Link>
      </p>
    </div>
  );
}
