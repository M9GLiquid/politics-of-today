import Link from "next/link";
import { getSession } from "@/lib/auth";
import { HeaderAuth } from "@/components/header-auth";
import { TopNewsTicker } from "@/components/top-news-ticker";
import { nationHeaderLabel } from "@/lib/nation-header-label";
import { resolveUserPartyDesk } from "@/lib/party-access";

export async function SiteHeader() {
  const session = await getSession();
  const partyDesk =
    session != null ? await resolveUserPartyDesk(session.sub) : null;

  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <TopNewsTicker nationId={session?.nationId ?? null} />
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href="/"
            className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Politics of Today
          </Link>
          {session?.nationSlug ? (
            <Link
              href={`/nations/${session.nationSlug}`}
              className="truncate rounded-md bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-200 dark:bg-teal-900/40 dark:text-teal-100 dark:hover:bg-teal-900/70"
              title="Nation budget & taxes"
            >
              {nationHeaderLabel(session)}
            </Link>
          ) : session ? (
            <span className="shrink-0 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              No nation selected
            </span>
          ) : null}
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/leaderboards">
            Leaderboards
          </Link>
          <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/parties">
            Parties
          </Link>
          <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/nations">
            Nations
          </Link>
          <Link className="hover:text-zinc-900 dark:hover:text-zinc-100" href="/wiki">
            Wiki
          </Link>
          {partyDesk ? (
            <Link
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
              href="/party"
            >
              Party desk
            </Link>
          ) : null}
          <HeaderAuth session={session} />
        </nav>
      </div>
    </header>
  );
}
