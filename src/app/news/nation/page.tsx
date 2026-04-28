import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NationNewsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.nationId) {
    redirect("/account/nation");
  }

  const nation = await prisma.nation.findUnique({
    where: { id: session.nationId },
    select: { id: true, name: true, slug: true },
  });
  if (!nation) {
    redirect("/account/nation");
  }

  const items = await prisma.newsItem.findMany({
    where: { scope: "NATION", nationId: nation.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 font-sans">
      <Link
        href={`/nations/${nation.slug}`}
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Nation
      </Link>
      <section className="news-shell mt-5">
        <header className="px-5 pb-5 pt-6 sm:px-6">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Nation News
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Headlines and effects specific to <strong>{nation.name}</strong>.
          </p>
        </header>

        <div className="news-tint-divider" />

        <div className="news-list-backdrop px-5 py-6 sm:px-6">
          <ul className="space-y-4">
            {items.map((x) => (
              <li
                key={x.id}
                className="rounded-2xl border border-zinc-200/95 bg-white/90 p-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {x.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {x.monthKey} · {x.createdAt.toLocaleString()}
                  </p>
                </div>
                {x.body.trim().length > 0 ? (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {x.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No nation news yet. World events will generate nation headlines
              when the monthly tick runs.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

