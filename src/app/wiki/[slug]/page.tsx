import Link from "next/link";
import { notFound } from "next/navigation";
import { getWikiArticle } from "@/lib/wiki";

type Props = { params: Promise<{ slug: string }> };

export default async function WikiArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getWikiArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/wiki"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Wiki index
      </Link>
      <header className="mt-6">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {article.title}
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          {article.excerpt}
        </p>
      </header>
      <div className="prose prose-zinc mt-10 max-w-none space-y-10 dark:prose-invert">
        {article.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {s.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {s.body}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
