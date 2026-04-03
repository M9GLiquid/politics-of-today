"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  adminListPartyDraftsAction,
  adminPublishDraftAction,
  type AdminPartyDraftRow,
} from "@/app/actions/admin-party";
import {
  applyAdminPreviewAction,
  clearAdminPreviewAction,
  clearVoteProgressDockAction,
  createBotUserAction,
  refreshJwtSessionDockAction,
} from "@/app/actions/admin-preview";
import type { AdminActiveLawSummaryRow } from "@/lib/db/active-law";
import type {
  AdminDockEnvReadout,
  AdminDockFiscalReadout,
  AdminPreviewCookieState,
  AdminPreviewNationOption,
  AdminPreviewPartyOption,
  AdminPreviewUserOption,
  DeveloperSessionLens,
} from "@/lib/admin-preview";
import { GameAdminLookupPanel } from "@/components/game-admin-lookup-panel";
import type { SessionUser } from "@/types/game";

const LS_KEY = "politics-of-today.adminDock.v1";
const DEV_TAB_LS = "politics-of-today.devDockTab";

type DevMainTab = "lens" | "simulate" | "world" | "engineering" | "gameAdmin";

function devTabAllowed(tab: DevMainTab, lens: DeveloperSessionLens): boolean {
  if (tab === "simulate") return lens === "user";
  if (tab === "gameAdmin") return lens === "staff";
  return true;
}

type UserSort = "recent" | "name" | "nation";

type Props = {
  jwtSession: SessionUser;
  effectiveSession: SessionUser | null;
  users: AdminPreviewUserOption[];
  nations: AdminPreviewNationOption[];
  parties: AdminPreviewPartyOption[];
  categoriesNav: { slug: string; name: string }[];
  initialCookie: AdminPreviewCookieState;
  envReadout: AdminDockEnvReadout;
  fiscalReadout: AdminDockFiscalReadout;
  activeLawRows: AdminActiveLawSummaryRow[];
  votingMonthLabel: string;
  activeLawYear: number;
  quickNationSlug: string | null;
};

type DockPanel = "main" | "createBot";

function randomBotSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function isPartyToolsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/party" || pathname.startsWith("/parties");
}

function isCategoryToolsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith("/categories/");
}

function partyIdFromPartiesPath(
  pathname: string | null,
  parties: AdminPreviewPartyOption[],
): string {
  if (!pathname) return "";
  const m = /^\/parties\/([^/]+)$/.exec(pathname);
  if (!m) return "";
  const seg = m[1];
  if (seg === "register") return "";
  const row = parties.find((p) => p.slug === seg);
  return row?.id ?? "";
}

function categorySlugFromPath(pathname: string): string {
  if (!pathname.startsWith("/categories/")) return "";
  const rest = pathname.slice("/categories/".length);
  const seg = rest.split("/").find(Boolean) ?? "";
  if (!seg || seg.includes("..")) return "";
  return seg;
}

/** Visual + scroll order mirrors game logic: clock → env → actor → nation → law → surfaces → session → rollover → re-point preview → seed users */
function DockSection({
  kicker,
  title,
  hint,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-2.5">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-500/80">
        <span className="text-zinc-600">{kicker}</span> {title}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[9px] leading-snug text-zinc-600">{hint}</p>
      ) : null}
      <div className={hint ? "mt-2" : "mt-1.5"}>{children}</div>
    </section>
  );
}

export function AdminPreviewDock({
  jwtSession,
  effectiveSession,
  users,
  nations,
  parties,
  categoriesNav,
  initialCookie,
  envReadout,
  fiscalReadout,
  activeLawRows,
  votingMonthLabel,
  activeLawYear,
  quickNationSlug,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const [impersonateId, setImpersonateId] = useState(
    initialCookie.impersonateUserId ?? "",
  );
  const [stripNation, setStripNation] = useState(initialCookie.stripNation);
  const [sessionLens, setSessionLens] = useState<DeveloperSessionLens>(
    initialCookie.sessionLens ?? "user",
  );

  const [mainTab, setMainTab] = useState<DevMainTab>(() => {
    if (typeof window === "undefined") return "lens";
    try {
      const raw = localStorage.getItem(DEV_TAB_LS);
      if (
        raw === "lens" ||
        raw === "simulate" ||
        raw === "world" ||
        raw === "engineering" ||
        raw === "gameAdmin"
      ) {
        return raw;
      }
    } catch {
      /* ignore */
    }
    return "lens";
  });

  const [userFilter, setUserFilter] = useState("");
  const [userSort, setUserSort] = useState<UserSort>("recent");

  const [botDisplayName, setBotDisplayName] = useState(
    () => `bot-${randomBotSuffix()}`,
  );
  const [botEmail, setBotEmail] = useState("");
  const [botNationSlug, setBotNationSlug] = useState("");
  const [botPassword, setBotPassword] = useState("botplay1");
  const [botIsAdmin, setBotIsAdmin] = useState(false);
  const [botIsGameStaff, setBotIsGameStaff] = useState(false);
  const [panel, setPanel] = useState<DockPanel>("main");

  const [cronSecret, setCronSecret] = useState("");
  const [rolloverBusy, setRolloverBusy] = useState(false);

  const [partyToolPartyId, setPartyToolPartyId] = useState("");
  const [partyDrafts, setPartyDrafts] = useState<AdminPartyDraftRow[]>([]);
  const [draftsBusy, setDraftsBusy] = useState(false);
  const [draftsMsg, setDraftsMsg] = useState<string | null>(null);
  const [manualPartyDraftId, setManualPartyDraftId] = useState("");

  useEffect(() => {
    setSessionLens(initialCookie.sessionLens ?? "user");
    setImpersonateId(initialCookie.impersonateUserId ?? "");
    setStripNation(initialCookie.stripNation);
  }, [
    initialCookie.sessionLens,
    initialCookie.impersonateUserId,
    initialCookie.stripNation,
  ]);

  useEffect(() => {
    setMainTab((cur) =>
      devTabAllowed(cur, sessionLens) ? cur : "lens",
    );
  }, [sessionLens]);

  useEffect(() => {
    try {
      localStorage.setItem(DEV_TAB_LS, mainTab);
    } catch {
      /* ignore */
    }
  }, [mainTab]);

  useEffect(() => {
    const fromUrl = partyIdFromPartiesPath(pathname, parties);
    if (fromUrl) setPartyToolPartyId(fromUrl);
  }, [pathname, parties]);

  useEffect(() => {
    setPartyDrafts([]);
    setDraftsMsg(null);
  }, [partyToolPartyId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const o = JSON.parse(raw) as {
        userSort?: UserSort;
        userFilter?: string;
        draftImpersonateId?: string;
        draftStripNation?: boolean;
      };
      if (o.userSort === "recent" || o.userSort === "name" || o.userSort === "nation") {
        setUserSort(o.userSort);
      }
      if (typeof o.userFilter === "string") setUserFilter(o.userFilter);
      const hasServerPreview =
        Boolean(initialCookie.impersonateUserId) || initialCookie.stripNation;
      if (!hasServerPreview && typeof o.draftImpersonateId === "string") {
        setImpersonateId(o.draftImpersonateId);
      }
      if (!hasServerPreview && o.draftStripNation === true) {
        setStripNation(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from LS vs initial server cookie
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            v: 1,
            userSort,
            userFilter,
            draftImpersonateId: impersonateId,
            draftStripNation: stripNation,
          }),
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [userSort, userFilter, impersonateId, stripNation]);

  const filteredSortedUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    let list = q
      ? users.filter(
          (u) =>
            u.label.toLowerCase().includes(q) ||
            u.kind.toLowerCase().includes(q) ||
            u.nationLabel.toLowerCase().includes(q),
        )
      : [...users];

    if (userSort === "name") {
      list.sort((a, b) => a.label.localeCompare(b.label));
    } else if (userSort === "nation") {
      list.sort((a, b) => {
        const n = a.nationLabel.localeCompare(b.nationLabel);
        if (n !== 0) return n;
        return a.label.localeCompare(b.label);
      });
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [users, userFilter, userSort]);

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsgOk(true);
      setMsg(`Copied ${label}`);
      window.setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsgOk(false);
      setMsg("Copy failed (clipboard permission).");
    }
  }, []);

  function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setMsg(null);
    setMsgOk(false);
    startTransition(() => {
      void (async () => {
        const r = await fn();
        if (!r.ok) {
          setMsg(r.error === "forbidden" ? "Not allowed." : `Error: ${r.error}`);
          return;
        }
        router.refresh();
      })();
    });
  }

  function runCreateBot() {
    if (
      !window.confirm(
        "Create this user in the database? This is a real account with login credentials.",
      )
    ) {
      return;
    }
    setMsg(null);
    setMsgOk(false);
    startTransition(() => {
      void (async () => {
        const r = await createBotUserAction({
          displayName: botDisplayName,
          email: botEmail.trim() || undefined,
          nationSlug: botNationSlug,
          password: botPassword.trim() || undefined,
          isAdministrator: botIsAdmin,
          isGameAdministrator: botIsGameStaff,
        });
        if (!r.ok) {
          setMsg(r.error === "forbidden" ? "Not allowed." : `Error: ${r.error}`);
          return;
        }
        setMsgOk(true);
        setMsg(
          `Created · ${r.displayName} · ${r.email} · password: ${r.password} · id: ${r.userId.slice(0, 8)}…`,
        );
        setBotDisplayName(`bot-${randomBotSuffix()}`);
        setBotEmail("");
        setBotNationSlug("");
        setBotPassword("botplay1");
        setBotIsAdmin(false);
        setBotIsGameStaff(false);
        setPanel("main");
        router.refresh();
      })();
    });
  }

  async function runPartyRollover() {
    const secret = cronSecret.trim();
    setMsg(null);
    setMsgOk(false);
    if (!secret) {
      setMsg("Enter CRON_SECRET (same as server .env) to run rollover.");
      return;
    }
    setRolloverBusy(true);
    try {
      const res = await fetch("/api/cron/party-rollover", {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(
          `Rollover HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`,
        );
        return;
      }
      const o = data as {
        publishMonth?: string;
        categoriesPromoted?: number;
        leadershipFinalized?: string | null;
      };
      setMsgOk(true);
      setMsg(
        `Rollover ok · month ${o.publishMonth ?? "?"} · promoted ${String(o.categoriesPromoted ?? "?")} · leadership ${o.leadershipFinalized ?? "—"}`,
      );
      router.refresh();
    } catch (e) {
      setMsg(`Rollover fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRolloverBusy(false);
    }
  }

  async function loadPartyDraftsForTool() {
    setDraftsMsg(null);
    if (!partyToolPartyId.trim()) {
      setDraftsMsg("Select a party first.");
      return;
    }
    setDraftsBusy(true);
    try {
      const r = await adminListPartyDraftsAction(partyToolPartyId);
      if (!r.ok) {
        setPartyDrafts([]);
        setDraftsMsg(
          r.error === "forbidden" ? "Not allowed." : `Error: ${r.error}`,
        );
        return;
      }
      setPartyDrafts(r.drafts);
    } finally {
      setDraftsBusy(false);
    }
  }

  function adminPublishDraftById(draftId: string) {
    if (
      !window.confirm(
        "Admin-publish this draft? Same effect as founder “Publish now” for that category.",
      )
    ) {
      return;
    }
    setMsg(null);
    setMsgOk(false);
    startTransition(() => {
      void (async () => {
        const r = await adminPublishDraftAction(draftId);
        if (!r.ok) {
          setMsg(
            r.error === "forbidden" ? "Not allowed." : `Error: ${r.error}`,
          );
          return;
        }
        setMsgOk(true);
        setMsg("Draft published (admin).");
        setManualPartyDraftId("");
        router.refresh();
        await loadPartyDraftsForTool();
      })();
    });
  }

  function adminPublishManualDraft() {
    const id = manualPartyDraftId.trim();
    if (!id) {
      setDraftsMsg("Paste a draft id.");
      return;
    }
    adminPublishDraftById(id);
  }

  function buildPreviewPayload(
    lens: DeveloperSessionLens,
  ): AdminPreviewCookieState {
    if (lens === "user") {
      return {
        sessionLens: "user",
        impersonateUserId: impersonateId || null,
        stripNation,
      };
    }
    return {
      sessionLens: lens,
      impersonateUserId: null,
      stripNation: false,
    };
  }

  function applyLens(next: DeveloperSessionLens) {
    setSessionLens(next);
    if (next === "staff") setMainTab("gameAdmin");
    else if (next === "user") setMainTab("simulate");
    else setMainTab("lens");
    run(() => applyAdminPreviewAction(buildPreviewPayload(next)));
  }

  const lensIsUser = sessionLens === "user";
  const previewing = Boolean(effectiveSession?.adminMeta);
  const partyToolSlug = parties.find((p) => p.id === partyToolPartyId)?.slug;

  const devTabs: { id: DevMainTab; label: string }[] = [
    { id: "lens", label: "Lens" },
    ...(sessionLens === "user"
      ? [{ id: "simulate" as DevMainTab, label: "Simulate" }]
      : []),
    ...(sessionLens === "staff"
      ? [{ id: "gameAdmin" as DevMainTab, label: "Game admin" }]
      : []),
    { id: "world", label: "World" },
    { id: "engineering", label: "Engineering" },
  ];

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col items-end gap-2">
      <div
        className={`pointer-events-auto max-h-[min(85vh,36rem)] w-[min(calc(100vw-2rem),24rem)] overflow-y-auto rounded-2xl border bg-zinc-950/95 p-4 text-xs text-zinc-100 shadow-xl backdrop-blur ${
          panel === "createBot"
            ? "border-red-700/70 ring-1 ring-red-900/50 dark:border-red-600/60"
            : "border-amber-500/60 dark:border-amber-400/50"
        }`}
        role="region"
        aria-label={panel === "main" ? "Developer dock" : "Create bot user"}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
              Developer
            </p>
            <p className="mt-0.5 text-[9px] leading-snug text-zinc-500">
              Start on <span className="text-zinc-400">Lens</span>, then use
              tabs. <span className="text-zinc-400">Admin</span> lens unlocks
              the Game admin tab (staff tools). Violet panel (left) is for real
              game staff.
            </p>
          </div>
          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-200">
            Dev
          </span>
        </div>

        {panel === "main" ? (
          <>
            <nav
              className="mt-3 flex flex-wrap gap-1 border-b border-zinc-800/90 pb-2"
              aria-label="Developer dock sections"
            >
              {devTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMainTab(t.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-semibold transition ${
                    mainTab === t.id
                      ? "bg-amber-600 text-amber-950 shadow-sm"
                      : "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="mt-3 flex flex-col gap-3">
              {mainTab === "lens" ? (
                <DockSection
                  kicker="●"
                  title="Session lens"
                  hint="Guest = logged-out pages. User = impersonate / strip nation. Admin = your real JWT; opens Game admin tab for staff-style lookups."
                >
                  <div className="flex rounded-lg border border-zinc-700 bg-zinc-950/80 p-0.5">
                    {(
                      [
                        ["guest", "Guest"],
                        ["user", "User"],
                        ["staff", "Admin"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={pending}
                        onClick={() => applyLens(value)}
                        className={`flex-1 rounded-md px-1.5 py-2 text-[10px] font-semibold transition disabled:opacity-50 ${
                          sessionLens === value
                            ? "bg-amber-600 text-amber-950 shadow-sm"
                            : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-zinc-300">
                    <span className="text-zinc-500">Signed in (JWT):</span>{" "}
                    <span className="font-medium text-zinc-100">
                      {jwtSession.email}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                    <span className="text-zinc-500">Effective:</span>{" "}
                    {effectiveSession ? (
                      <>
                        <span className="font-medium text-zinc-100">
                          {effectiveSession.name} · {effectiveSession.email}
                        </span>
                        {previewing ? (
                          <span className="ml-1 rounded bg-amber-500/20 px-1 py-0.5 text-[10px] text-amber-200">
                            impersonation
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="font-medium text-zinc-400">
                        Guest — logged-out UI on pages
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      disabled={!effectiveSession}
                      className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() =>
                        effectiveSession &&
                        void copyText("effective id", effectiveSession.sub)
                      }
                    >
                      Copy id
                    </button>
                    <button
                      type="button"
                      disabled={!effectiveSession}
                      className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() =>
                        effectiveSession &&
                        void copyText("effective email", effectiveSession.email)
                      }
                    >
                      Copy email
                    </button>
                  </div>
                </DockSection>
              ) : null}

              {mainTab === "gameAdmin" && sessionLens === "staff" ? (
                <DockSection
                  kicker="◎"
                  title="Game admin (preview)"
                  hint="Same player lookups as the violet staff panel. Uses your developer JWT — for testing support flows while in Admin lens."
                >
                  <GameAdminLookupPanel
                    authMode="developer"
                    accent="amber"
                  />
                </DockSection>
              ) : null}

              {mainTab === "simulate" && lensIsUser ? (
                <DockSection
                  kicker="◇"
                  title="Simulate user"
                  hint="Impersonation issues real DB writes as the target. Strip nation simulates onboarding / guest fiscal."
                >
                  <input
                    type="search"
                    placeholder="Filter list…"
                    value={userFilter}
                    disabled={pending}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
                  />
                  <select
                    className="mt-2 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200"
                    value={userSort}
                    disabled={pending}
                    onChange={(e) => setUserSort(e.target.value as UserSort)}
                  >
                    <option value="recent">Sort: newest first</option>
                    <option value="name">Sort: name A–Z</option>
                    <option value="nation">Sort: nation</option>
                  </select>
                  <select
                    className="mt-1 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-2 text-sm text-zinc-100"
                    value={impersonateId}
                    disabled={pending}
                    onChange={(e) => setImpersonateId(e.target.value)}
                  >
                    <option value="">— Yourself (no impersonation) —</option>
                    {filteredSortedUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label} [{u.kind}] · {u.nationLabel}
                      </option>
                    ))}
                  </select>
                  {filteredSortedUsers.length === 0 ? (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      No users match filter.
                    </p>
                  ) : null}
                  <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={stripNation}
                      disabled={pending}
                      onChange={(e) => setStripNation(e.target.checked)}
                      className="rounded border-zinc-600"
                    />
                    Strip nation (preview &quot;choose nation&quot; / guest
                    fiscal)
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          applyAdminPreviewAction(buildPreviewPayload("user")),
                        )
                      }
                      className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-500 disabled:opacity-50"
                    >
                      {pending ? "Applying…" : "Apply preview"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setImpersonateId("");
                        setStripNation(false);
                        setSessionLens("user");
                        run(() => clearAdminPreviewAction());
                      }}
                      className="rounded-full border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Reset
                    </button>
                  </div>
                </DockSection>
              ) : null}

              {mainTab === "world" ? (
                <>
                  <DockSection
                    kicker="1"
                    title="Sim clock"
                    hint="Voting month drives public ballots and the vote-progress cookie. Law tallies use the calendar year below. UTC month is what cron rollover keys off."
                  >
                    <div className="font-mono text-[10px] leading-relaxed text-zinc-400">
                      <p>
                        <span className="text-zinc-500">Voting month:</span>{" "}
                        {votingMonthLabel}
                      </p>
                      <p>
                        <span className="text-zinc-500">Law year:</span>{" "}
                        {activeLawYear}
                      </p>
                      <p>
                        <span className="text-zinc-500">UTC month:</span>{" "}
                        {envReadout.utcMonth}
                      </p>
                    </div>
                  </DockSection>
                  <DockSection
                    kicker="2"
                    title="Dev & simulation"
                    hint="These twist headcount and labels only — not in-world party logic."
                  >
                    <div className="font-mono text-[10px] leading-relaxed text-zinc-400">
                      <p>NODE_ENV: {envReadout.nodeEnv}</p>
                      <p>
                        REGISTERED_VOTER_COUNT:{" "}
                        {envReadout.registeredVoterOverride
                          ? "set (synthetic headcount)"
                          : "off (live voter count)"}
                      </p>
                    </div>
                  </DockSection>
                  <DockSection
                    kicker="4"
                    title="Nation & economy"
                    hint="Envelope uses the effective user's nation (or combined pool if none / strip-nation preview)."
                  >
                    <p className="text-[10px] text-zinc-300">
                      {fiscalReadout.scopeLabel}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      Total ≈{" "}
                      <span className="text-zinc-200">
                        {fiscalReadout.totalAnnual.toFixed(2)}
                      </span>{" "}
                      · voters {fiscalReadout.displayVoterCount}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Static net {fiscalReadout.staticRevenueNet.toFixed(2)} ·
                      Population {fiscalReadout.populationNetAnnual.toFixed(4)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Tax {fiscalReadout.taxesAnnual.toFixed(1)} · Ex{" "}
                      {fiscalReadout.exportsAnnual.toFixed(1)} · Im{" "}
                      {fiscalReadout.importsAnnual.toFixed(1)}
                    </p>
                  </DockSection>
                  <DockSection
                    kicker="5"
                    title={`Law in effect (${activeLawYear})`}
                    hint="Per-category plurality winners for the calendar year — same basis as radar / active policy."
                  >
                    <ul className="max-h-28 space-y-1 overflow-y-auto text-[10px] text-zinc-400">
                      {activeLawRows.map((row) => (
                        <li key={row.categorySlug}>
                          <Link
                            href={`/categories/${row.categorySlug}`}
                            className="font-medium text-teal-400/90 hover:underline"
                          >
                            {row.categoryName}
                          </Link>
                          <span className="text-zinc-500"> — </span>
                          <span className="text-zinc-400">{row.line}</span>
                        </li>
                      ))}
                    </ul>
                  </DockSection>
                  <DockSection
                    kicker="6"
                    title="Open in game"
                    hint="Rough player flow: nation membership → nation view → category ballot → party drafts & platform."
                  >
                    <div className="flex flex-col gap-1 text-[11px]">
                      <Link
                        className="text-teal-400 hover:underline"
                        href="/account/nation"
                      >
                        /account/nation
                      </Link>
                      {quickNationSlug ? (
                        <Link
                          className="text-teal-400 hover:underline"
                          href={`/nations/${quickNationSlug}`}
                        >
                          /nations/{quickNationSlug}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">/nations/… (no slug)</span>
                      )}
                      <Link
                        className="text-teal-400 hover:underline"
                        href="/categories/infrastructure"
                      >
                        /categories/infrastructure
                      </Link>
                      <Link
                        className="text-teal-400 hover:underline"
                        href="/party"
                      >
                        /party
                      </Link>
                    </div>
                  </DockSection>
                </>
              ) : null}

              {mainTab === "engineering" ? (
                <>
                  <DockSection
                    kicker="7"
                    title="Browser session"
                    hint="JWT should match DB after profile/nation changes. Vote cookie tracks completed categories for the current voting month."
                  >
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => refreshJwtSessionDockAction())}
                        className="rounded-full border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Refresh JWT
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => clearVoteProgressDockAction())}
                        className="rounded-full border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                      >
                        Clear vote cookie
                      </button>
                    </div>
                  </DockSection>
                  <DockSection
                    kicker="8"
                    title="Party month rollover"
                    hint="Server cron: promote winning internal drafts into published policies for the new UTC month; on quarter starts, finalize prior leadership ballots."
                  >
                    <input
                      type="password"
                      autoComplete="off"
                      placeholder="CRON_SECRET"
                      value={cronSecret}
                      onChange={(e) => setCronSecret(e.target.value)}
                      className="w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
                    />
                    <button
                      type="button"
                      disabled={rolloverBusy}
                      onClick={() => void runPartyRollover()}
                      className="mt-2 rounded-full bg-zinc-700 px-3 py-1 text-[10px] font-medium text-white hover:bg-zinc-600 disabled:opacity-50"
                    >
                      {rolloverBusy ? "POST…" : "Run rollover"}
                    </button>
                  </DockSection>
                  {isPartyToolsPath(pathname) ? (
                    <DockSection
                      kicker="P"
                      title="This page — party"
                      hint="Party list, desk, and party profile — load drafts and admin-publish without being the founder."
                    >
                      <p className="break-all font-mono text-[10px] text-zinc-500">
                        {pathname}
                      </p>
                      <div className="mt-2 space-y-2 border-t border-zinc-800 pt-2">
                        <select
                          className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1.5 text-[11px] text-zinc-200"
                          value={partyToolPartyId}
                          onChange={(e) => setPartyToolPartyId(e.target.value)}
                        >
                          <option value="">— Select party —</option>
                          {parties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.slug})
                            </option>
                          ))}
                        </select>
                        {partyToolPartyId && partyToolSlug ? (
                          <Link
                            href={`/parties/${partyToolSlug}`}
                            className="inline-block text-[11px] text-teal-400 hover:underline"
                          >
                            Open party profile →
                          </Link>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={draftsBusy || !partyToolPartyId}
                            onClick={() => void loadPartyDraftsForTool()}
                            className="rounded-full border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                          >
                            {draftsBusy ? "Loading…" : "Load drafts"}
                          </button>
                          <Link
                            href="/party"
                            className="rounded-full border border-zinc-600 px-2.5 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800"
                          >
                            Open /party desk
                          </Link>
                        </div>
                        {draftsMsg ? (
                          <p className="text-[10px] text-red-300">{draftsMsg}</p>
                        ) : null}
                        <ul className="max-h-32 space-y-2 overflow-y-auto text-[10px] text-zinc-400">
                          {partyDrafts.map((d) => (
                            <li
                              key={d.id}
                              className="rounded border border-zinc-800 bg-zinc-950/80 p-1.5"
                            >
                              <p className="font-mono text-[9px] text-zinc-500">
                                {d.id.slice(0, 12)}…
                              </p>
                              <p className="text-zinc-300">{d.catchPhrase}</p>
                              <p className="text-zinc-500">
                                {d.categoryName} · month{" "}
                                {d.draftVotingMonth ?? "—"}
                              </p>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => adminPublishDraftById(d.id)}
                                className="mt-1 rounded-full bg-amber-700/80 px-2 py-0.5 text-[9px] font-semibold text-amber-50 hover:bg-amber-600 disabled:opacity-50"
                              >
                                Publish (admin)
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-zinc-800 pt-2">
                          <p className="text-[9px] text-zinc-500">
                            Or paste draft id (cuid):
                          </p>
                          <input
                            value={manualPartyDraftId}
                            onChange={(e) =>
                              setManualPartyDraftId(e.target.value)
                            }
                            className="mt-1 w-full rounded border border-zinc-600 bg-zinc-950 px-2 py-1 font-mono text-[10px] text-zinc-200"
                            placeholder="clx…"
                          />
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => adminPublishManualDraft()}
                            className="mt-1 rounded-full bg-zinc-700 px-2.5 py-1 text-[10px] text-white hover:bg-zinc-600 disabled:opacity-50"
                          >
                            Publish by id
                          </button>
                        </div>
                      </div>
                    </DockSection>
                  ) : null}
                  {isCategoryToolsPath(pathname ?? "") ? (
                    <DockSection
                      kicker="P"
                      title="This page — category"
                      hint="Jump to any voting category."
                    >
                      <p className="break-all font-mono text-[10px] text-zinc-500">
                        {pathname}
                      </p>
                      {(() => {
                        const slug = categorySlugFromPath(pathname ?? "");
                        const label =
                          categoriesNav.find((c) => c.slug === slug)?.name ??
                          slug;
                        return (
                          <p className="mt-2 text-[11px] text-zinc-300">
                            Ballot:{" "}
                            <span className="font-medium text-zinc-100">
                              {label || "—"}
                            </span>
                          </p>
                        );
                      })()}
                      <div className="mt-2 max-h-36 overflow-y-auto rounded border border-zinc-800 bg-zinc-950/60 p-1.5">
                        <ul className="grid grid-cols-1 gap-0.5 text-[10px] sm:grid-cols-2">
                          {categoriesNav.map((c) => (
                            <li key={c.slug}>
                              <Link
                                href={`/categories/${c.slug}`}
                                className={
                                  categorySlugFromPath(pathname ?? "") === c.slug
                                    ? "font-semibold text-amber-300/90 hover:underline"
                                    : "text-teal-400/90 hover:underline"
                                }
                              >
                                {c.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </DockSection>
                  ) : null}
                  <DockSection
                    kicker="10"
                    title="Seed test user"
                    hint="Creates a real User row (login works)."
                  >
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        setMsg(null);
                        setMsgOk(false);
                        setPanel("createBot");
                      }}
                      className="w-full rounded-xl border border-zinc-600 bg-zinc-900 px-3 py-2.5 text-left text-sm font-medium text-zinc-100 transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Create bot
                      <span className="mt-0.5 block text-[10px] font-normal text-zinc-500">
                        Writes DB — confirm on submit
                      </span>
                    </button>
                  </DockSection>
                </>
              ) : null}
            </div>
          </>

        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 border-t border-zinc-700 pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setPanel("main");
                  setMsg(null);
                  setMsgOk(false);
                }}
                className="rounded-full border border-zinc-600 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                ← Back
              </button>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-300/90">
                Create bot user
              </p>
            </div>

            <p className="mt-2 text-[10px] text-red-200/80">
              Writes a real User row. Confirm on submit.
            </p>

            <label className="mt-3 block text-[10px] text-zinc-500">
              Display name
            </label>
            <input
              type="text"
              className="mt-0.5 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              value={botDisplayName}
              disabled={pending}
              onChange={(e) => setBotDisplayName(e.target.value)}
            />
            <label className="mt-2 block text-[10px] text-zinc-500">
              Email (empty = auto{" "}
              <code className="text-zinc-400">@debug.local</code>)
            </label>
            <input
              type="text"
              className="mt-0.5 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              value={botEmail}
              disabled={pending}
              onChange={(e) => setBotEmail(e.target.value)}
              placeholder="bot-…@debug.local"
            />
            <label className="mt-2 block text-[10px] text-zinc-500">Nation</label>
            <select
              className="mt-0.5 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              value={botNationSlug}
              disabled={pending}
              onChange={(e) => setBotNationSlug(e.target.value)}
            >
              <option value="">— No nation (pick later) —</option>
              {nations.map((n) => (
                <option key={n.id} value={n.slug}>
                  {n.name}
                </option>
              ))}
            </select>
            <label className="mt-2 block text-[10px] text-zinc-500">
              Password (min 4 chars; default botplay1)
            </label>
            <input
              type="text"
              className="mt-0.5 w-full rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              value={botPassword}
              disabled={pending}
              onChange={(e) => setBotPassword(e.target.value)}
              autoComplete="off"
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={botIsAdmin}
                disabled={pending}
                onChange={(e) => setBotIsAdmin(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Developer dock (<code className="text-zinc-500">isAdministrator</code>)
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={botIsGameStaff}
                disabled={pending}
                onChange={(e) => setBotIsGameStaff(e.target.checked)}
                className="rounded border-zinc-600"
              />
              Game admin panel (<code className="text-zinc-500">isGameAdministrator</code>)
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={() => runCreateBot()}
              className="mt-4 w-full rounded-full bg-red-900/80 px-3 py-2 text-xs font-semibold text-red-50 hover:bg-red-800 disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create bot user"}
            </button>
          </>
        )}

        {msg ? (
          <p
            className={
              msgOk
                ? "mt-3 text-[11px] text-emerald-300"
                : "mt-3 text-[11px] text-red-300"
            }
            role="alert"
          >
            {msg}
          </p>
        ) : null}

        <p className="mt-3 border-t border-zinc-700 pt-3 text-[10px] leading-relaxed text-zinc-500">
          Tabs persist in localStorage. Admin lens switches you to the Game admin tab.
          Production still uses{" "}
          <code className="rounded bg-zinc-800 px-1">ADMIN_PREVIEW_ENABLED</code>
          . Violet panel:{" "}
          <code className="rounded bg-zinc-800 px-1">GAME_ADMIN_UI_ENABLED</code>.
        </p>
      </div>
    </div>
  );
}
