import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import { winningPolicyIdMapForNation } from "@/lib/db/active-law";
import { currentCalendarYear, listNationsOrdered } from "@/lib/nations";

type TabKey = "party" | "nation" | "player";
type SearchParams = Promise<{
  tab?: string;
  page?: string;
  start?: string;
  rank?: string;
  nation?: string;
  party?: string;
}>;

type PodiumItem = {
  id: string;
  href: string;
  name: string;
  metric: string;
};

const PAGE_SIZE = 30;
const PLAYER_WINDOW_SIZE = 21;
const podiumOrder = [1, 0, 2] as const;

function parsePositiveInt(input: string | undefined): number {
  if (!input) return 1;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

function parseOptionalPositiveInt(input: string | undefined): number | null {
  if (!input) return null;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

function parseNonNegativeInt(input: string | undefined): number | null {
  if (!input) return null;
  const n = Number.parseInt(input, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function normalizeTab(input: string | undefined): TabKey {
  if (input === "party" || input === "player") return input;
  return "nation";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tabHref(tab: TabKey): string {
  return `/leaderboards?tab=${tab}`;
}

function tabPageHref(tab: "nation" | "party", page: number): string {
  return `/leaderboards?tab=${tab}&page=${page}`;
}

function formatWealth(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function nationFlagGradient(slug: string | undefined): string {
  switch (slug) {
    case "orion":
      return "linear-gradient(135deg, #0ea5e9 0%, #1d4ed8 100%)";
    case "celeste":
      return "linear-gradient(135deg, #22c55e 0%, #15803d 100%)";
    case "andosian":
      return "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)";
    case "veydris":
      return "linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)";
    case "kethara":
      return "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)";
    default:
      return "linear-gradient(135deg, #71717a 0%, #3f3f46 100%)";
  }
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab, page, start, rank, nation, party } = await searchParams;
  const session = await getSession();
  const activeTab = normalizeTab(tab);
  const pageNumberInput = parsePositiveInt(page);
  const hasExplicitPage = page !== undefined;

  let total = 0;
  let pageNumber = 1;
  let totalPages = 1;
  let pageStart = 0;

  let nationRows: Array<{
    id: string;
    name: string;
    slug: string;
    accumulativeWealth: number;
  }> = [];
  let nationTop3: Array<{
    id: string;
    name: string;
    slug: string;
    accumulativeWealth: number;
  }> = [];

  let partyRows: Array<{
    id: string;
    name: string;
    slug: string;
    acceptedPolicies: number;
  }> = [];
  let partyTop3: Array<{
    id: string;
    name: string;
    slug: string;
    acceptedPolicies: number;
  }> = [];

  let playerRows: Array<{
    id: string;
    rank: number;
    displayName: string;
    wealth: number;
    Nation: { slug: string; name: string } | null;
    Party: { slug: string; name: string; shortName: string; accentColor: string } | null;
    nationTintClass: string;
  }> = [];
  let playerTop3: Array<{
    id: string;
    displayName: string;
    wealth: number;
    Nation: { slug: string; name: string } | null;
    Party: { slug: string; name: string; shortName: string; accentColor: string } | null;
  }> = [];

  let playerStartIndex = 0;
  let playerMaxStart = 0;
  let viewerRank: number | null = null;
  let viewerNationId: string | null = null;
  let viewerNationRank: number | null = null;
  let viewerPartyId: string | null = null;
  let viewerPartyRank: number | null = null;
  let selectedNationFilter = "";
  let selectedPartyFilter = "";
  let playerNationOptions: Array<{ slug: string; name: string }> = [];
  let playerPartyOptions: Array<{ slug: string; name: string }> = [];

  if (activeTab === "nation") {
    const viewerNation = session
      ? await prisma.user.findUnique({
          where: { id: session.sub },
          select: { Nation: { select: { id: true } } },
        })
      : null;

    viewerNationId = viewerNation?.Nation?.id ?? null;

    total = await prisma.nation.count();
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pageNumber = Math.min(pageNumberInput, totalPages);

    if (viewerNationId) {
      const rankedNationIds = await prisma.nation.findMany({
        orderBy: [
          { accumulativeWealth: "desc" },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        select: { id: true },
      });
      const idx = rankedNationIds.findIndex((n) => n.id === viewerNationId);
      if (idx >= 0) {
        viewerNationRank = idx + 1;
        if (!hasExplicitPage) {
          pageNumber = Math.floor(idx / PAGE_SIZE) + 1;
        }
      }
    }

    pageStart = (pageNumber - 1) * PAGE_SIZE;

    const [pageRows, topRows] = await Promise.all([
      prisma.nation.findMany({
        orderBy: [
          { accumulativeWealth: "desc" },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        skip: pageStart,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          slug: true,
          accumulativeWealth: true,
        },
      }),
      prisma.nation.findMany({
        orderBy: [
          { accumulativeWealth: "desc" },
          { sortOrder: "asc" },
          { id: "asc" },
        ],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          accumulativeWealth: true,
        },
      }),
    ]);

    nationRows = pageRows;
    nationTop3 = topRows;
  }

  if (activeTab === "party") {
    const year = currentCalendarYear();
    const [categories, nations, parties] = await Promise.all([
      listCategoriesOrdered(),
      listNationsOrdered(),
      prisma.party.findMany({
        where: { isSystem: false },
        select: {
          id: true,
          slug: true,
          name: true,
          createdAt: true,
        },
      }),
    ]);

    const winnersByNation = await Promise.all(
      nations.map((n) => winningPolicyIdMapForNation(n.id, year, categories)),
    );

    const winnerIds = new Set<string>();
    for (const winners of winnersByNation) {
      for (const policyId of winners.values()) winnerIds.add(policyId);
    }

    const winnerPolicies =
      winnerIds.size > 0
        ? await prisma.partyPolicy.findMany({
            where: { id: { in: [...winnerIds] } },
            select: { id: true, partyId: true },
          })
        : [];

    const partyIdByPolicyId = new Map(winnerPolicies.map((p) => [p.id, p.partyId]));
    const acceptedCountByPartyId = new Map<string, number>();
    for (const p of parties) acceptedCountByPartyId.set(p.id, 0);

    for (const winners of winnersByNation) {
      for (const policyId of winners.values()) {
        const partyId = partyIdByPolicyId.get(policyId);
        if (!partyId) continue;
        acceptedCountByPartyId.set(
          partyId,
          (acceptedCountByPartyId.get(partyId) ?? 0) + 1,
        );
      }
    }

    const ranked = parties
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        createdAt: p.createdAt,
        acceptedPolicies: acceptedCountByPartyId.get(p.id) ?? 0,
      }))
      .sort((a, b) => {
        const d = b.acceptedPolicies - a.acceptedPolicies;
        if (d !== 0) return d;
        const createdDelta = a.createdAt.getTime() - b.createdAt.getTime();
        if (createdDelta !== 0) return createdDelta;
        return a.id.localeCompare(b.id);
      });

    pageNumber = pageNumberInput;

    if (session) {
      const [ownedParty, memberParty] = await Promise.all([
        prisma.party.findFirst({
          where: { ownerUserId: session.sub, isSystem: false },
          select: { id: true },
        }),
        prisma.partyMember.findFirst({
          where: { userId: session.sub },
          select: { partyId: true },
        }),
      ]);

      viewerPartyId = ownedParty?.id ?? memberParty?.partyId ?? null;

      if (viewerPartyId) {
        const idx = ranked.findIndex((p) => p.id === viewerPartyId);
        if (idx >= 0) {
          viewerPartyRank = idx + 1;
          if (!hasExplicitPage) {
            pageNumber = Math.floor(idx / PAGE_SIZE) + 1;
          }
        }
      }
    }

    total = ranked.length;
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pageNumber = Math.min(pageNumber, totalPages);
    pageStart = (pageNumber - 1) * PAGE_SIZE;

    partyRows = ranked.slice(pageStart, pageStart + PAGE_SIZE);
    partyTop3 = ranked.slice(0, 3);
  }

  if (activeTab === "player") {
    selectedNationFilter = typeof nation === "string" ? nation : "";
    selectedPartyFilter = typeof party === "string" ? party : "";

    const [rankedPlayers, nations] = await Promise.all([
      prisma.user.findMany({
        where: { role: "VOTER" },
        orderBy: [{ wealth: "desc" }, { createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          displayName: true,
          wealth: true,
          Nation: {
            select: { slug: true, name: true },
          },
        },
      }),
      listNationsOrdered(),
    ]);

    const nationTints = [
      "bg-sky-50/60 dark:bg-sky-950/20",
      "bg-emerald-50/60 dark:bg-emerald-950/20",
      "bg-amber-50/60 dark:bg-amber-950/20",
      "bg-rose-50/60 dark:bg-rose-950/20",
      "bg-indigo-50/60 dark:bg-indigo-950/20",
    ];
    const nationTintBySlug = new Map(
      nations.map((n, i) => [n.slug, nationTints[i % nationTints.length]]),
    );

    playerNationOptions = nations.map((n) => ({ slug: n.slug, name: n.name }));

    const allPlayerIds = rankedPlayers.map((r) => r.id);

    const [ownedParties, memberships] = await Promise.all([
      prisma.party.findMany({
        where: { ownerUserId: { in: allPlayerIds } },
        select: {
          ownerUserId: true,
          slug: true,
          name: true,
          shortName: true,
          accentColor: true,
        },
      }),
      prisma.partyMember.findMany({
        where: { userId: { in: allPlayerIds } },
        select: {
          userId: true,
          Party: {
            select: {
              slug: true,
              name: true,
              shortName: true,
              accentColor: true,
            },
          },
        },
      }),
    ]);

    const partyByUserId = new Map<
      string,
      { slug: string; name: string; shortName: string; accentColor: string }
    >();

    for (const o of ownedParties) {
      if (o.ownerUserId) {
        partyByUserId.set(o.ownerUserId, {
          slug: o.slug,
          name: o.name,
          shortName: o.shortName,
          accentColor: o.accentColor,
        });
      }
    }

    for (const m of memberships) {
      if (!partyByUserId.has(m.userId)) {
        partyByUserId.set(m.userId, {
          slug: m.Party.slug,
          name: m.Party.name,
          shortName: m.Party.shortName,
          accentColor: m.Party.accentColor,
        });
      }
    }

    const enrichedPlayers = rankedPlayers.map((r) => ({
      ...r,
      Party: partyByUserId.get(r.id) ?? null,
    }));

    playerPartyOptions = Array.from(
      new Map(
        enrichedPlayers
          .filter((r) => r.Party)
          .map((r) => [r.Party!.slug, { slug: r.Party!.slug, name: r.Party!.name }]),
      ).values(),
    ).sort((a, b) => a.name.localeCompare(b.name));

    if (
      selectedNationFilter &&
      !playerNationOptions.some((n) => n.slug === selectedNationFilter)
    ) {
      selectedNationFilter = "";
    }
    if (
      selectedPartyFilter &&
      !playerPartyOptions.some((p) => p.slug === selectedPartyFilter)
    ) {
      selectedPartyFilter = "";
    }

    const filteredPlayers = enrichedPlayers.filter((r) => {
      if (selectedNationFilter && r.Nation?.slug !== selectedNationFilter) return false;
      if (selectedPartyFilter && r.Party?.slug !== selectedPartyFilter) return false;
      return true;
    });

    total = filteredPlayers.length;
    playerMaxStart = Math.max(0, total - PLAYER_WINDOW_SIZE);

    const explicitStart = parseNonNegativeInt(start);
    const requestedRank = parseOptionalPositiveInt(rank);

    const viewerIndex = session
      ? filteredPlayers.findIndex((r) => r.id === session.sub)
      : -1;
    if (viewerIndex >= 0) viewerRank = viewerIndex + 1;

    const rankStart =
      requestedRank != null
        ? clamp(requestedRank - 1 - Math.floor(PLAYER_WINDOW_SIZE / 2), 0, playerMaxStart)
        : null;

    const aroundMeStart =
      viewerIndex >= 0
        ? clamp(viewerIndex - Math.floor(PLAYER_WINDOW_SIZE / 2), 0, playerMaxStart)
        : 0;

    playerStartIndex = clamp(explicitStart ?? rankStart ?? aroundMeStart, 0, playerMaxStart);

    pageStart = playerStartIndex;
    pageNumber = Math.floor(playerStartIndex / PLAYER_WINDOW_SIZE) + 1;
    totalPages = Math.max(1, Math.ceil(total / PLAYER_WINDOW_SIZE));

    const windowSlice = filteredPlayers.slice(
      playerStartIndex,
      playerStartIndex + PLAYER_WINDOW_SIZE,
    );

    const topSlice = filteredPlayers.slice(0, 3);

    playerRows = windowSlice.map((r, i) => ({
      id: r.id,
      rank: playerStartIndex + i + 1,
      displayName: r.displayName,
      wealth: r.wealth,
      Nation: r.Nation,
      Party: r.Party,
      nationTintClass: r.Nation ? (nationTintBySlug.get(r.Nation.slug) ?? "") : "",
    }));

    playerTop3 = topSlice.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      wealth: r.wealth,
      Nation: r.Nation,
      Party: r.Party,
    }));
  }

  const showingStart = activeTab === "player" ? playerStartIndex : pageStart;
  const showingSize = activeTab === "player" ? PLAYER_WINDOW_SIZE : PAGE_SIZE;

  const canPrev =
    activeTab === "player" ? playerStartIndex > 0 : pageNumber > 1;
  const canNext =
    activeTab === "player"
      ? playerStartIndex + PLAYER_WINDOW_SIZE < total
      : pageNumber < totalPages;

  const playerHref = ({
    start: nextStart,
    rank: nextRank,
  }: {
    start?: number;
    rank?: number;
  }): string => {
    const params = new URLSearchParams();
    params.set("tab", "player");
    if (selectedNationFilter) params.set("nation", selectedNationFilter);
    if (selectedPartyFilter) params.set("party", selectedPartyFilter);
    if (nextStart != null) params.set("start", String(nextStart));
    if (nextRank != null) params.set("rank", String(nextRank));
    return `/leaderboards?${params.toString()}`;
  };

  const playerFilterHref = ({
    nation: nextNation,
    party: nextParty,
  }: {
    nation?: string;
    party?: string;
  }): string => {
    const params = new URLSearchParams();
    params.set("tab", "player");
    if (nextNation) params.set("nation", nextNation);
    if (nextParty) params.set("party", nextParty);
    return `/leaderboards?${params.toString()}`;
  };

  const navPrevHref =
    activeTab === "player"
      ? playerHref({ start: Math.max(0, playerStartIndex - PLAYER_WINDOW_SIZE) })
      : `/leaderboards?tab=${activeTab}&page=${pageNumber - 1}`;
  const navNextHref =
    activeTab === "player"
      ? playerHref({
          start: Math.min(playerMaxStart, playerStartIndex + PLAYER_WINDOW_SIZE),
        })
      : `/leaderboards?tab=${activeTab}&page=${pageNumber + 1}`;

  const aroundMeHref =
    activeTab === "player" && viewerRank
      ? playerHref({
          start: clamp(
            viewerRank - 1 - Math.floor(PLAYER_WINDOW_SIZE / 2),
            0,
            playerMaxStart,
          ),
        })
      : null;

  const aroundNationHref =
    viewerNationRank != null
      ? tabPageHref("nation", Math.floor((viewerNationRank - 1) / PAGE_SIZE) + 1)
      : null;

  const aroundPartyHref =
    viewerPartyRank != null
      ? tabPageHref("party", Math.floor((viewerPartyRank - 1) / PAGE_SIZE) + 1)
      : null;

  const podiumItems: PodiumItem[] =
    activeTab === "nation"
      ? nationTop3.map((r) => ({
          id: r.id,
          href: `/nations/${r.slug}`,
          name: r.name,
          metric: formatWealth(r.accumulativeWealth),
        }))
      : activeTab === "party"
        ? partyTop3.map((r) => ({
            id: r.id,
            href: `/parties/${r.slug}`,
            name: r.name,
            metric: `${r.acceptedPolicies} accepted`,
          }))
        : playerTop3.map((r) => ({
            id: r.id,
            href: "#",
            name: r.displayName,
            metric: formatWealth(r.wealth),
          }));
  const activeViewerRank =
    activeTab === "nation"
      ? viewerNationRank
      : activeTab === "party"
        ? viewerPartyRank
        : viewerRank;
  const activeViewerId =
    activeTab === "nation"
      ? viewerNationId
      : activeTab === "party"
        ? viewerPartyId
        : session?.sub ?? null;
  const activeRankLabel =
    activeTab === "nation"
      ? "Your nation"
      : activeTab === "party"
        ? "Your party"
        : "You";
  const activeRankMessage = activeViewerRank
    ? activeTab === "player"
      ? `You are ranked #${activeViewerRank}`
      : `${activeRankLabel} is ranked #${activeViewerRank}`
    : "";

  const activeRowClass = "bg-teal-500/5 ring-1 ring-inset ring-teal-500/70";
  const activeBadgeClass =
    "ml-2 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-900 dark:bg-teal-900/40 dark:text-teal-100";
  const leaderboardTableClass = "min-w-full text-left text-sm";
  const leaderboardBodyClass =
    "divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Leaderboards
        </h1>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          Nation, Party, and Player rankings in one place.
        </p>
      </header>

      <section className="mt-4 overflow-visible rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800 sm:px-4">
          <nav
            aria-label="Leaderboard type"
            className="inline-flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900"
          >
            <Link
              href={tabHref("nation")}
              aria-current={activeTab === "nation" ? "page" : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                activeTab === "nation"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              }`}
            >
              Nation
            </Link>
            <Link
              href={tabHref("party")}
              aria-current={activeTab === "party" ? "page" : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                activeTab === "party"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              }`}
            >
              Party
            </Link>
            <Link
              href={tabHref("player")}
              aria-current={activeTab === "player" ? "page" : undefined}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                activeTab === "player"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              }`}
            >
              Player
            </Link>
          </nav>

          {activeTab === "player" ? (
            <div className="mt-3 flex flex-wrap items-start gap-3 text-xs">
              {aroundMeHref ? (
                <Link
                  href={aroundMeHref}
                  className="inline-flex h-8 items-center rounded-md border border-zinc-300 px-3 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Around me
                </Link>
              ) : null}
              <form
                action="/leaderboards"
                method="get"
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/70 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <input type="hidden" name="tab" value="player" />
                <label className="text-zinc-500 dark:text-zinc-400">Nation</label>
                <select
                  name="nation"
                  defaultValue={selectedNationFilter}
                  className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="">All</option>
                  {playerNationOptions.map((n) => (
                    <option key={n.slug} value={n.slug}>
                      {n.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Filter
                </button>
              </form>
              <form
                action="/leaderboards"
                method="get"
                className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50/70 px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <input type="hidden" name="tab" value="player" />
                {selectedNationFilter ? (
                  <input type="hidden" name="nation" value={selectedNationFilter} />
                ) : null}
                {selectedPartyFilter ? (
                  <input type="hidden" name="party" value={selectedPartyFilter} />
                ) : null}
                <label className="text-zinc-500 dark:text-zinc-400">Go to rank</label>
                <input
                  type="number"
                  name="rank"
                  min={1}
                  max={Math.max(1, total)}
                  defaultValue={viewerRank ?? undefined}
                  className="h-8 w-20 rounded-md border border-zinc-300 bg-white px-2 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center rounded-md bg-zinc-900 px-3 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Go
                </button>
              </form>
            </div>
          ) : null}

          {activeTab === "nation" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={tabPageHref("nation", 1)}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Top
              </Link>
              {aroundNationHref ? (
                <Link
                  href={aroundNationHref}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Around your nation
                </Link>
              ) : null}
            </div>
          ) : null}

          {activeTab === "party" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Link
                href={tabPageHref("party", 1)}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Top
              </Link>
              {aroundPartyHref ? (
                <Link
                  href={aroundPartyHref}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Around your party
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="min-w-0 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800">
            {activeTab === "nation" ? (
              <table className={leaderboardTableClass}>
                <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-300">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Nation</th>
                    <th className="px-3 py-2 text-right">Total wealth</th>
                  </tr>
                </thead>
                <tbody className={leaderboardBodyClass}>
                  {nationRows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={viewerNationId === r.id ? activeRowClass : undefined}
                    >
                      <td className="px-3 py-1.5 text-zinc-500">#{pageStart + i + 1}</td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/nations/${r.slug}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          {r.name}
                        </Link>
                        {viewerNationId === r.id ? (
                          <span className={activeBadgeClass}>
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-200">
                        {formatWealth(r.accumulativeWealth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {activeTab === "party" ? (
              <table className={leaderboardTableClass}>
                <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-300">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Party</th>
                    <th className="px-3 py-2 text-right">Policies accepted</th>
                  </tr>
                </thead>
                <tbody className={leaderboardBodyClass}>
                  {partyRows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={viewerPartyId === r.id ? activeRowClass : undefined}
                    >
                      <td className="px-3 py-1.5 text-zinc-500">#{pageStart + i + 1}</td>
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/parties/${r.slug}`}
                          className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          {r.name}
                        </Link>
                        {viewerPartyId === r.id ? (
                          <span className={activeBadgeClass}>
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-200">
                        {r.acceptedPolicies}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {activeTab === "player" ? (
              <table className={leaderboardTableClass}>
                <thead className="bg-zinc-100 text-xs text-zinc-600 uppercase dark:bg-zinc-900 dark:text-zinc-300">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        Party
                        <details className="relative inline-block">
                          <summary
                            className="inline-flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                            title="Filter party"
                            aria-label="Filter party"
                          >
                            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                              <path
                                d="M3 4h14l-5.5 6v5l-3-1.8V10L3 4Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </summary>
                          <div className="absolute right-0 z-20 mt-1 max-h-64 w-52 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                            <Link
                              href={playerFilterHref({ nation: selectedNationFilter, party: "" })}
                              className="block rounded px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              All parties
                            </Link>
                            {playerPartyOptions.map((p) => (
                              <Link
                                key={p.slug}
                                href={playerFilterHref({
                                  nation: selectedNationFilter,
                                  party: p.slug,
                                })}
                                className={`block rounded px-2 py-1 text-[11px] hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                  selectedPartyFilter === p.slug
                                    ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                    : "text-zinc-700 dark:text-zinc-200"
                                }`}
                              >
                                {p.name}
                              </Link>
                            ))}
                          </div>
                        </details>
                      </span>
                    </th>
                    <th className="px-3 py-2 text-right">Wealth</th>
                  </tr>
                </thead>
                <tbody className={leaderboardBodyClass}>
                  {playerRows.map((r) => (
                    <tr
                      key={r.id}
                      className={session?.sub === r.id ? activeRowClass : undefined}
                    >
                      <td className="px-3 py-1.5 text-zinc-500">#{r.rank}</td>
                      <td className="px-3 py-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                        <span
                          className="mr-2 inline-flex h-4 w-7 items-center justify-center overflow-hidden rounded-sm border border-zinc-300 dark:border-zinc-700"
                          title={r.Nation ? r.Nation.name : "Unaffiliated"}
                          style={{
                            background: nationFlagGradient(r.Nation?.slug),
                          }}
                        >
                          <span className="text-[9px] font-bold text-white/95">
                            {r.Nation ? r.Nation.name.charAt(0).toUpperCase() : "-"}
                          </span>
                        </span>
                        <span>{r.displayName}</span>
                        {session?.sub === r.id ? (
                          <span className={activeBadgeClass}>
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-1.5">
                        {r.Party ? (
                          <Link
                            href={`/parties/${r.Party.slug}`}
                            className="inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-200"
                            style={{
                              borderColor: r.Party.accentColor,
                              backgroundColor: `${r.Party.accentColor}22`,
                            }}
                            title={r.Party.name}
                          >
                            {r.Party.name}
                          </Link>
                        ) : (
                          <span className="inline-flex rounded-full border border-zinc-300 bg-white/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300">
                            None
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium text-zinc-700 dark:text-zinc-200">
                        {formatWealth(r.wealth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {total > 0 ? (
              <nav
                className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-3 py-3 text-sm dark:border-zinc-800 sm:px-4"
                aria-label="Leaderboard pagination"
              >
                <p className="text-zinc-500 dark:text-zinc-400">
                  Showing {showingStart + 1}–{Math.min(showingStart + showingSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  {canPrev ? (
                    <Link
                      href={navPrevHref}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {activeTab === "player" ? "Up" : "Previous"}
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                      {activeTab === "player" ? "Up" : "Previous"}
                    </span>
                  )}
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Page {pageNumber} of {totalPages}
                  </span>
                  {canNext ? (
                    <Link
                      href={navNextHref}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {activeTab === "player" ? "Down" : "Next"}
                    </Link>
                  ) : (
                    <span className="rounded-lg border border-zinc-200 px-3 py-1.5 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
                      {activeTab === "player" ? "Down" : "Next"}
                    </span>
                  )}
                </div>
              </nav>
            ) : (
              <p className="px-3 py-4 text-sm text-zinc-500 sm:px-4">No results to show.</p>
            )}
          </div>

          <aside className="border-t border-zinc-200 px-3 py-4 dark:border-zinc-800 sm:px-4 lg:border-t-0 lg:pl-4">
            <p className="mb-3 text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Top 3 Podium
            </p>
            {podiumItems.length > 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex h-48 items-end justify-center gap-2">
                  {podiumOrder
                    .filter((idx) => idx < podiumItems.length)
                    .map((idx) => {
                      const item = podiumItems[idx]!;
                      const place = idx + 1;
                      const height = place === 1 ? 124 : place === 2 ? 94 : 78;
                      const topFace =
                        place === 1
                          ? "from-amber-200 via-amber-300 to-amber-500"
                          : place === 2
                            ? "from-zinc-200 via-zinc-300 to-zinc-500"
                            : "from-orange-200 via-orange-300 to-orange-500";
                      const frontFace =
                        place === 1
                          ? "from-amber-500 via-amber-600 to-amber-800"
                          : place === 2
                            ? "from-zinc-500 via-zinc-600 to-zinc-800"
                            : "from-orange-500 via-orange-600 to-orange-800";
                      const sideFace =
                        place === 1
                          ? "from-amber-700 to-amber-950"
                          : place === 2
                            ? "from-zinc-700 to-zinc-950"
                            : "from-orange-700 to-orange-950";
                      const podiumDepth = place === 1 ? 16 : 14;

                      return (
                        <div key={item.id} className="flex w-[29%] flex-col items-center">
                          <Link
                            href={item.href}
                            className="mb-2 block w-full truncate text-center text-[11px] font-semibold text-zinc-800 hover:underline dark:text-zinc-100"
                            title={item.name}
                          >
                            {item.name}
                          </Link>
                          <div className="relative w-full" style={{ height }}>
                            {activeViewerId === item.id && place <= 3 ? (
                              <div
                                className="absolute left-1/2 z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-500 shadow-md dark:border-amber-300/40 dark:bg-zinc-950"
                                style={{ top: podiumDepth - 12 }}
                                title={activeRankMessage}
                                aria-label={activeRankMessage}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="m12 2.7 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7Z" />
                                </svg>
                              </div>
                            ) : null}
                            <div
                              className="absolute inset-x-0 bottom-0 mx-auto w-[86%]"
                              style={{
                                height: height - 8,
                              }}
                            >
                              <div
                                className={`absolute left-0 top-0 z-10 border border-white/35 bg-gradient-to-r ${topFace} shadow-[0_8px_14px_rgba(0,0,0,0.16)] dark:border-white/10`}
                                style={{
                                  right: podiumDepth,
                                  height: podiumDepth,
                                  borderTopLeftRadius: 7,
                                  borderTopRightRadius: 5,
                                  clipPath: `polygon(${podiumDepth}px 0, 100% 0, calc(100% - ${podiumDepth}px) 100%, 0 100%)`,
                                }}
                              />
                              <div
                                className={`absolute right-0 top-0 bg-gradient-to-b ${sideFace} opacity-95 shadow-[8px_8px_18px_rgba(0,0,0,0.22)]`}
                                style={{
                                  width: podiumDepth,
                                  height: "100%",
                                  borderTopRightRadius: 6,
                                  borderBottomRightRadius: 6,
                                  clipPath: `polygon(0 ${podiumDepth}px, 100% 0, 100% calc(100% - ${podiumDepth}px), 0 100%)`,
                                }}
                              />
                              <div
                                className={`absolute bottom-0 left-0 z-0 border border-white/25 bg-gradient-to-b ${frontFace} shadow-[0_16px_24px_rgba(0,0,0,0.28)] dark:border-white/10`}
                                style={{
                                  top: podiumDepth,
                                  right: podiumDepth,
                                  borderBottomLeftRadius: 6,
                                  borderBottomRightRadius: 6,
                                }}
                              >
                                <div className="pt-3 text-center text-sm font-black text-white drop-shadow">
                                  #{place}
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                            {item.metric}
                          </p>
                        </div>
                      );
                    })}
                </div>
                {activeViewerRank ? (
                  <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-50 px-3 py-2 text-center text-xs font-semibold text-teal-950 shadow-sm dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-100">
                    {activeRankMessage}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No podium data yet.</p>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
