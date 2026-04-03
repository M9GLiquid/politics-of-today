import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ballotIdSetFromRanked } from "@/lib/ballot-parties";
import { TOP_PARTY_BALLOT_SIZE } from "@/lib/constants";
import { PartyUpvoteButton } from "@/components/party-upvote-button";

type SearchParams = Promise<{ q?: string }>;

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const session = await getSession();
  const viewerNationId = session?.nationId ?? null;

  const parties = await prisma.party.findMany({
    where: {
      isSystem: false,
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { shortName: { contains: query } },
              { slug: { contains: query } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          PartyUpvote: viewerNationId
            ? { where: { nationId: viewerNationId } }
            : true,
        },
      },
    },
  });

  const sorted = [...parties].sort((a, b) => {
    const diff = b._count.PartyUpvote - a._count.PartyUpvote;
    if (diff !== 0) return diff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const ballotIds = ballotIdSetFromRanked(sorted);
  const rankById = new Map(sorted.map((p, i) => [p.id, i + 1]));

  const myUpvotes =
    session != null
      ? new Set(
          (
            await prisma.partyUpvote.findMany({
              where: { userId: session.sub },
              select: { partyId: true },
            })
          ).map((x) => x.partyId),
        )
      : new Set<string>();

  const viewerMembership =
    session != null
      ? await prisma.partyMember.findUnique({
          where: { userId: session.sub },
          select: { id: true },
        })
      : null;

  const viewerOwnsParty =
    session != null
      ? await prisma.party.findFirst({
          where: { ownerUserId: session.sub },
          select: { id: true, slug: true, name: true },
        })
      : null;

  const canRegisterNewParty =
    session != null && !viewerOwnsParty && !viewerMembership;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <header className="mt-6">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Parties
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Upvotes count toward your nation&apos;s ballot only. The top{" "}
          {TOP_PARTY_BALLOT_SIZE} in your nation (ties → older parties first)
          supply policy cards alongside the baseline. Guests see global totals.
        </p>
      </header>

      <form className="mt-8 flex gap-2" action="/parties" method="get">
        <input
          type="search"
          name="q"
          placeholder="Search name or slug…"
          defaultValue={query}
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Search
        </button>
      </form>

      <div className="mt-4 flex flex-col gap-3 text-sm">
        {session && viewerOwnsParty ? (
          <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 dark:border-teal-900/50 dark:bg-teal-950/30">
            <p className="font-medium text-teal-900 dark:text-teal-100">
              You founded {viewerOwnsParty.name}
            </p>
            <p className="mt-1 text-teal-800/90 dark:text-teal-200/90">
              Party desk is where you control membership, drafts, and publishing.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/party"
                className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-600"
              >
                Open party desk
              </Link>
              <Link
                href={`/parties/${viewerOwnsParty.slug}`}
                className="rounded-full border border-teal-700 px-4 py-2 text-sm font-medium text-teal-800 dark:border-teal-500 dark:text-teal-200"
              >
                Public profile
              </Link>
            </div>
          </div>
        ) : null}
        {session && !viewerOwnsParty && viewerMembership ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            You are in a party — open{" "}
            <Link
              href="/party"
              className="font-medium text-teal-700 underline dark:text-teal-400"
            >
              Party desk
            </Link>{" "}
            to participate or leave to join another.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {canRegisterNewParty ? (
            <Link
              href="/parties/register"
              className="font-medium text-teal-700 underline dark:text-teal-400"
            >
              Register a new party
            </Link>
          ) : null}
          <Link
            href="/register"
            className="text-zinc-600 hover:underline dark:text-zinc-400"
          >
            Create voter account
          </Link>
        </div>
      </div>

      <ul className="mt-10 flex flex-col gap-4">
        {sorted.map((p) => {
          const onBallot = ballotIds.has(p.id);
          const rank = rankById.get(p.id) ?? 0;
          return (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/parties/${p.slug}`}
                    className="text-lg font-semibold text-zinc-900 hover:text-teal-800 dark:text-zinc-50 dark:hover:text-teal-300"
                  >
                    {p.name}
                  </Link>
                  {onBallot ? (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-teal-900 uppercase dark:bg-teal-900/40 dark:text-teal-100">
                      Ballot #{rank}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">Rank #{rank}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  /{p.slug} · {p._count.PartyUpvote} upvote
                  {p._count.PartyUpvote === 1 ? "" : "s"}
                  {viewerNationId ? " in your nation" : " (all nations)"}
                </p>
              </div>
              <PartyUpvoteButton
                partyId={p.id}
                initialCount={p._count.PartyUpvote}
                initialUpvoted={myUpvotes.has(p.id)}
                disabled={!session || !session.nationId}
                disabledHint={
                  !session
                    ? "Log in to vote"
                    : !session.nationId
                      ? "Pick a nation (Account)"
                      : undefined
                }
              />
            </li>
          );
        })}
      </ul>

      {sorted.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">No parties match that search.</p>
      ) : null}
    </div>
  );
}
