import Link from "next/link";
import { wikiArticles } from "@/lib/wiki";

export default function WikiIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Wiki
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        In-depth explainers for the simulation. Content ships as structured data
        today; swap for MDX or a CMS when you scale.
      </p>
      <ul className="mt-10 flex flex-col gap-6">
        {wikiArticles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/wiki/${a.slug}`}
              className="group block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-teal-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-teal-500"
            >
              <h2 className="text-lg font-semibold text-zinc-900 group-hover:text-teal-800 dark:text-zinc-50 dark:group-hover:text-teal-300">
                {a.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {a.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
