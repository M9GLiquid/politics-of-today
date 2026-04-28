import Link from "next/link";
import { prisma } from "@/lib/prisma";

function getChangelogBadge(input: { title: string; body: string; tagsCsv: string }) {
  const text = `${input.tagsCsv} ${input.title} ${input.body}`.toLowerCase();

  if (/\bhotfix\b|\bpatch\b|\bcritical\b|\burgent\b/.test(text)) {
    return { label: "Hotfix", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" };
  }

  if (/\bmajor\b|\bbreaking\b|\brelease\b/.test(text)) {
    return {
      label: "Major Update",
      className: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
    };
  }

  if (/\bbalance\b|\btuning\b|\bnerf\b|\bbuff\b/.test(text)) {
    return {
      label: "Balance",
      className: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    };
  }

  return null;
}

export default async function ChangelogNewsPage() {
  const items = await prisma.newsItem.findMany({
    where: { scope: "CHANGELOG" },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <section className="news-shell mt-5">
        <header className="px-5 pb-5 pt-6 sm:px-6">
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Changelog
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Product updates, balancing changes, and release notes for Politics of
            Today.
          </p>
        </header>

        <div className="news-tint-divider" />

        <div className="news-list-backdrop px-5 py-6 sm:px-6">
          <ul className="space-y-4">
            {items.map((x) => {
              const badge = getChangelogBadge({
                title: x.title,
                body: x.body,
                tagsCsv: x.tagsCsv,
              });

              return (
                <li
                  key={x.id}
                  className="rounded-2xl border border-zinc-200/95 bg-white/90 p-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {badge ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {x.title}
                      </p>
                    </div>
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
              );
            })}
          </ul>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No changelog posts yet. Publish your first update note to start the
              release history.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
