import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AllowMemberJoinToggle } from "@/components/allow-member-join-toggle";
import { LeavePartyButton } from "@/components/leave-party-button";
import { PartyDescriptionForm } from "@/components/party-description-form";
import {
  PartyLeadershipPanel,
  type LeadershipRosterRow,
} from "@/components/party-leadership-panel";
import {
  PartyPolicyDraftsPanel,
  type CategoryDraftBlock,
  type DraftRow,
} from "@/components/party-policy-drafts-panel";
import { PartyTransferPmForm } from "@/components/party-transfer-pm-form";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import { leadershipPeriodKey, utcMonthKey } from "@/lib/party-months";
import {
  PARTY_RANK_MEMBER,
  PARTY_RANK_PM,
  canAuthorPolicyDraft,
  resolvePartyMemberRank,
} from "@/lib/party-ranks";
import { resolveUserPartyDesk } from "@/lib/party-access";
import { prisma } from "@/lib/prisma";

export default async function PartyDeskPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const ctx = await resolveUserPartyDesk(session.sub);
  if (!ctx) {
    redirect("/parties");
  }

  const { party, isOwner } = ctx;
  const votingMonth = utcMonthKey();
  const periodKey = leadershipPeriodKey();

  const myRank = await resolvePartyMemberRank(session.sub, party.id);
  const canDraft = canAuthorPolicyDraft(myRank);
  const canVoteInternal = myRank === PARTY_RANK_MEMBER;
  const canTransferPm =
    myRank === PARTY_RANK_PM || isOwner;

  const [
    categories,
    members,
    ownerUser,
    drafts,
    myVotes,
    officeVotes,
    councilVotes,
    publishedPolicies,
  ] = await Promise.all([
    listCategoriesOrdered(),
    prisma.partyMember.findMany({
      where: { partyId: party.id },
      include: { User: { select: { displayName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    party.ownerUserId
      ? prisma.user.findUnique({
          where: { id: party.ownerUserId },
          select: { displayName: true, email: true },
        })
      : Promise.resolve(null),
    prisma.partyPolicyDraft.findMany({
      where: {
        partyId: party.id,
        OR: [
          { draftVotingMonth: null },
          { draftVotingMonth: votingMonth },
        ],
      },
      include: {
        User: { select: { displayName: true } },
        _count: {
          select: {
            PartyDraftVote: { where: { votingMonth } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.partyDraftVote.findMany({
      where: {
        userId: session.sub,
        partyId: party.id,
        votingMonth,
      },
    }),
    prisma.partyOfficeLeadershipVote.findMany({
      where: {
        partyId: party.id,
        voterUserId: session.sub,
        periodKey,
      },
    }),
    prisma.partyCouncilLeadershipVote.findMany({
      where: {
        partyId: party.id,
        voterUserId: session.sub,
        periodKey,
      },
    }),
    prisma.partyPolicy.findMany({
      where: { partyId: party.id },
      include: { Category: true },
      orderBy: { Category: { sortOrder: "asc" } },
    }),
  ]);

  const myPickByCategory = new Map(
    myVotes.map((v) => [v.categoryId, v.draftId]),
  );

  const draftsByCategory = new Map<string, typeof drafts>();
  for (const d of drafts) {
    const list = draftsByCategory.get(d.categoryId) ?? [];
    list.push(d);
    draftsByCategory.set(d.categoryId, list);
  }

  const blocks: CategoryDraftBlock[] = categories.map((c) => {
    const list = draftsByCategory.get(c.id) ?? [];
    const rows: DraftRow[] = list.map((d) => ({
      id: d.id,
      catchPhrase: d.catchPhrase,
      shortDescription: d.shortDescription,
      voteCount: d._count.PartyDraftVote,
      createdByName: d.User.displayName,
    }));
    return {
      categoryId: c.id,
      categoryName: c.name,
      drafts: rows,
      myPickDraftId: myPickByCategory.get(c.id) ?? null,
    };
  });

  const rosterMap = new Map<string, { displayName: string; rank: string }>();
  for (const m of members) {
    rosterMap.set(m.userId, {
      displayName: m.User.displayName,
      rank: m.rank,
    });
  }
  if (party.ownerUserId && ownerUser && !rosterMap.has(party.ownerUserId)) {
    rosterMap.set(party.ownerUserId, {
      displayName: ownerUser.displayName,
      rank: PARTY_RANK_PM,
    });
  }
  const roster: LeadershipRosterRow[] = [...rosterMap.entries()].map(
    ([userId, v]) => ({
      userId,
      displayName: v.displayName,
      rank: v.rank,
    }),
  );

  const pmPick =
    officeVotes.find((v) => v.office === "PM")?.candidateUserId ?? null;
  const vicePick =
    officeVotes.find((v) => v.office === "VICE_PM")?.candidateUserId ?? null;
  const councilPicks = councilVotes.map((v) => v.candidateUserId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Party desk
      </h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        <strong>{party.name}</strong>
        {isOwner ? (
          <span className="ml-2 rounded bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-900 dark:bg-teal-900/40 dark:text-teal-100">
            Founder
          </span>
        ) : null}
        {myRank ? (
          <span className="ml-2 rounded bg-zinc-200 px-2 py-0.5 text-xs font-medium dark:bg-zinc-700">
            {myRank.replace("_", "-")}
          </span>
        ) : null}
      </p>

      {party.description.trim().length > 0 ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
          {party.description}
        </p>
      ) : (
        <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
          Add a party description (founder only, min. 80 characters).
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/parties/${party.slug}`}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-600"
        >
          Public profile
        </Link>
        <Link
          href="/parties"
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white dark:bg-teal-500"
        >
          Party leaderboard
        </Link>
      </div>

      {isOwner ? (
        <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Party description
          </h2>
          <PartyDescriptionForm
            partyId={party.id}
            initialDescription={party.description}
          />
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Roster ({roster.length})
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {roster.map((r) => (
            <li key={r.userId}>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {r.displayName}
              </span>{" "}
              <span className="text-xs text-zinc-500">
                ({r.rank.replace("_", "-")})
              </span>
            </li>
          ))}
        </ul>
        {!isOwner ? (
          <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <LeavePartyButton />
          </div>
        ) : null}
      </section>

      {canTransferPm ? (
        <section className="mt-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Governance
          </h2>
          <PartyTransferPmForm
            partyId={party.id}
            selfUserId={session.sub}
            members={members.map((m) => ({
              userId: m.userId,
              displayName: m.User.displayName,
            }))}
          />
        </section>
      ) : null}

      {isOwner ? (
        <section className="mt-8 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Membership
          </h2>
          <div className="mt-3">
            <AllowMemberJoinToggle
              partyId={party.id}
              initialValue={party.allowMemberJoin}
            />
          </div>
        </section>
      ) : null}

      <PartyLeadershipPanel
        partyId={party.id}
        periodKey={periodKey}
        canVote={canVoteInternal}
        roster={roster}
        selfUserId={session.sub}
        pmPick={pmPick}
        vicePick={vicePick}
        councilPicks={councilPicks}
      />

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Published policies (national ballot)
        </h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          {publishedPolicies.map((p) => (
            <li key={p.id}>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {p.Category.name}:
              </span>{" "}
              {p.catchPhrase}
              {p.publishedMonth ? (
                <span className="ml-2 text-xs text-zinc-500">
                  · {p.publishedMonth}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <PartyPolicyDraftsPanel
        partyId={party.id}
        canDraft={canDraft}
        canVote={canVoteInternal}
        canPublish={isOwner}
        votingMonthLabel={votingMonth}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        blocks={blocks}
      />
    </div>
  );
}
