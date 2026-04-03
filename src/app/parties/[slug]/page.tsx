import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listRankedNonSystemParties } from "@/lib/ballot-parties";
import { TOP_PARTY_BALLOT_SIZE } from "@/lib/constants";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import { utcMonthKey } from "@/lib/party-months";
import { JoinPartyButton } from "@/components/join-party-button";
import { PartyUpvoteButton } from "@/components/party-upvote-button";

type Props = { params: Promise<{ slug: string }> };

export default async function PartyProfilePage({ params }: Props) {
  const { slug } = await params;
  const ballotMonth = utcMonthKey();
  const party = await prisma.party.findUnique({
    where: { slug },
    include: {
      PartyPolicy: {
        where: {
          OR: [
            { Party: { isSystem: true } },
            {
              Party: { isSystem: false },
              OR: [
                { publishedMonth: ballotMonth },
                { publishedMonth: null },
              ],
            },
          ],
        },
        include: { Category: true },
      },
    },
  });
  if (!party) notFound();

  const session = await getSession();
  const categories = await listCategoriesOrdered();

  const ranked = await listRankedNonSystemParties(session?.nationId ?? null);
  const ballotSlice = ranked.slice(0, TOP_PARTY_BALLOT_SIZE);
  const rank = ranked.findIndex((p) => p.id === party.id) + 1;
  const onBallot = ballotSlice.some((p) => p.id === party.id);
  const nationUpvotes =
    ranked.find((p) => p.id === party.id)?._count.upvotes ?? 0;

  const myUp =
    session != null
      ? await prisma.partyUpvote.findUnique({
          where: {
            userId_partyId: { userId: session.sub, partyId: party.id },
          },
        })
      : null;

  const partyMemberRow =
    session != null
      ? await prisma.partyMember.findUnique({
          where: { userId: session.sub },
        })
      : null;
  const viewerOwnsAnyParty =
    session != null
      ? await prisma.party.findFirst({
          where: { ownerUserId: session.sub },
          select: { id: true },
        })
      : null;
  const isOwnerHere = session != null && party.ownerUserId === session.sub;
  const isMemberHere = partyMemberRow?.partyId === party.id;
  const alreadyAffiliated = !!viewerOwnsAnyParty || !!partyMemberRow;
  const canJoinParty =
    session != null &&
    !!session.nationId &&
    party.allowMemberJoin &&
    !party.isSystem &&
    !isOwnerHere &&
    !isMemberHere &&
    !alreadyAffiliated;

  const roster = await prisma.partyMember.findMany({
    where: { partyId: party.id },
    include: { User: { select: { displayName: true } } },
    orderBy: { createdAt: "asc" },
  });

  const ownerPublic =
    party.ownerUserId != null
      ? await prisma.user.findUnique({
          where: { id: party.ownerUserId },
          select: { displayName: true },
        })
      : null;

  const founderInRoster =
    party.ownerUserId != null &&
    roster.some((m) => m.userId === party.ownerUserId);

  const policyByCategory = new Map(
    party.PartyPolicy.map((pol) => [pol.categoryId, pol]),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/parties"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Parties
      </Link>

      <p className="mt-4 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        Party profile
      </p>

      <header
        className="mt-2 flex flex-col gap-4 border-b border-l-4 border-zinc-200 pb-6 pl-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderLeftColor: party.accentColor }}
      >
        <div>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            {party.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            {party.shortName}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            /{party.slug}
            {party.isSystem ? (
              <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
                System baseline
              </span>
            ) : null}
          </p>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Rank #{rank} by upvotes
            {session?.nationId ? " in your nation" : " (all nations)"}
            {onBallot ? (
              <span className="ml-2 font-medium text-teal-700 dark:text-teal-400">
                · On the top-{TOP_PARTY_BALLOT_SIZE} ballot
              </span>
            ) : (
              <span className="ml-2 text-zinc-500">
                · Not on the ballot yet
              </span>
            )}
          </p>
          {party.allowMemberJoin && !party.isSystem ? (
            <p className="mt-2 text-xs font-medium text-teal-800 dark:text-teal-200">
              Open to new members — join from the button below.
            </p>
          ) : null}
        </div>
        {!party.isSystem ? (
          <PartyUpvoteButton
            partyId={party.id}
            initialCount={nationUpvotes}
            initialUpvoted={!!myUp}
            disabled={!session || !session.nationId}
            disabledHint={
              !session
                ? "Log in to vote"
                : !session.nationId
                  ? "Pick a nation (Account)"
                  : undefined
            }
          />
        ) : null}
      </header>

      {party.description.trim().length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Platform
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {party.description}
          </p>
        </section>
      ) : null}

      {!party.isSystem && (roster.length > 0 || ownerPublic) ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Leadership &amp; members
          </h2>
          <ul className="mt-3 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {party.ownerUserId && ownerPublic && !founderInRoster ? (
              <li>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {ownerPublic.displayName}
                </span>{" "}
                <span className="text-xs text-zinc-500">(founder)</span>
              </li>
            ) : null}
            {roster.map((m) => (
              <li key={m.id}>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {m.User.displayName}
                </span>{" "}
                <span className="text-xs text-zinc-500">
                  ({m.rank.replace("_", "-")})
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!party.isSystem ? (
        <div className="mt-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          {isOwnerHere ? (
            <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-800 dark:text-zinc-200">
                  You control this party.
                </strong>{" "}
                Open{" "}
                <Link
                  href="/party"
                  className="font-medium text-teal-700 underline dark:text-teal-400"
                >
                  Party desk
                </Link>{" "}
                for membership (who can join), leadership, and policy drafts.
              </p>
              {!party.allowMemberJoin ? (
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  New members cannot join until you turn on{" "}
                  <strong>Allow new members</strong> on Party desk.
                </p>
              ) : null}
            </div>
          ) : isMemberHere ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You belong to this party. Open{" "}
              <Link
                href="/party"
                className="font-medium text-teal-700 underline dark:text-teal-400"
              >
                Party desk
              </Link>{" "}
              — leadership drafts proposals; members vote each month for what
              publishes nationally.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {!session
                  ? "Log in and pick a nation to join as a member."
                  : !session.nationId
                    ? "Pick a nation under Account before you can join."
                    : viewerOwnsAnyParty
                      ? "You already founded a party — run it from Party desk. You cannot join a second party as a member while you are still the founder."
                      : partyMemberRow
                        ? "You already belong to a party. Leave it on Party desk before you can join this one."
                        : !party.allowMemberJoin
                          ? "This party is not accepting new members yet (the founder can open joins on Party desk)."
                          : "Join to help propose policies and vote on what gets published."}
              </p>
              <JoinPartyButton
                partyId={party.id}
                disabled={!canJoinParty}
                disabledHint={
                  !session
                    ? "Log in"
                    : !session.nationId
                      ? "Pick a nation"
                      : viewerOwnsAnyParty
                        ? "Founder — use Party desk"
                        : partyMemberRow
                          ? "Leave your party first"
                          : !party.allowMemberJoin
                            ? "Closed to joins"
                            : undefined
                }
              />
            </div>
          )}
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Active policies (0–1 per category)
        </h2>
        <ul className="mt-4 flex flex-col gap-6">
          {categories.map((c) => {
            const pol = policyByCategory.get(c.id);
            return (
              <li
                key={c.id}
                className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {c.name}
                  </h3>
                  {pol ? (
                    <Link
                      href={`/categories/${c.slug}`}
                      className="text-xs font-medium text-teal-700 underline dark:text-teal-400"
                    >
                      Open in category →
                    </Link>
                  ) : null}
                </div>
                {pol ? (
                  <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {pol.catchPhrase}
                    </p>
                    <p className="mt-1">{pol.shortDescription}</p>
                    <p className="mt-2 text-xs text-zinc-500">
                      Budget Δ vs baseline: {pol.budgetDeltaVsActive >= 0 ? "+" : ""}
                      {pol.budgetDeltaVsActive} · {pol.monthsToComplete} months
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">No published policy.</p>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
