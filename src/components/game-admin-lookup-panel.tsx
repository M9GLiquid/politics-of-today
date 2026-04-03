"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  developerSupportLookupByEmailAction,
  developerSupportLookupByPublicCodeAction,
  gameAdminGetUserByIdAction,
  gameAdminLookupByEmailAction,
  gameAdminLookupByPublicCodeAction,
  gameAdminSearchPlayersAction,
  type GameAdminUserCard,
} from "@/app/actions/game-admin";
import {
  gameAdminBanUserAction,
  gameAdminMuteUserAction,
  gameAdminUnbanUserAction,
  gameAdminUnmuteUserAction,
} from "@/app/actions/game-admin-moderation";

function PanelSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: "violet" | "amber";
  children: ReactNode;
}) {
  const border =
    accent === "violet"
      ? "border-violet-900/50 bg-violet-950/30"
      : "border-amber-900/40 bg-amber-950/20";
  const label =
    accent === "violet"
      ? "text-violet-300/90"
      : "text-amber-400/85";
  return (
    <section className={`rounded-lg border p-2.5 ${border}`}>
      <p className={`text-[9px] font-semibold uppercase tracking-wide ${label}`}>
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function moderationStatusText(card: GameAdminUserCard): string {
  if (card.bannedAt) return "Banned";
  if (card.mutedUntil) {
    const until = new Date(card.mutedUntil);
    if (until > new Date()) return `Muted until ${until.toLocaleString()}`;
  }
  return "Active";
}

type AuthMode = "gameAdmin" | "developer";

type Props = {
  authMode: AuthMode;
  /** Shown above the form when standalone game-admin dock */
  intro?: ReactNode;
  accent?: "violet" | "amber";
  /** When set, loads this user on mount (e.g. /admin/player/[id] page). */
  initialUserId?: string;
};

export function GameAdminLookupPanel({
  authMode,
  intro,
  accent = "violet",
  initialUserId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [msgOk, setMsgOk] = useState(false);
  const [emailQ, setEmailQ] = useState("");
  const [codeQ, setCodeQ] = useState("");
  const [playerSearchQ, setPlayerSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<GameAdminUserCard[]>([]);
  const [card, setCard] = useState<GameAdminUserCard | null>(null);
  const [banReasonDraft, setBanReasonDraft] = useState("");
  const [muteHours, setMuteHours] = useState("24");

  const showModeration = authMode === "gameAdmin";
  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsgOk(true);
      setMsg(`Copied ${label}`);
      setTimeout(() => setMsg(null), 2000);
    } catch {
      setMsgOk(false);
      setMsg("Copy failed.");
    }
  }, []);

  const loadUserById = useCallback(
    (userId: string) => {
      if (!showModeration) return;
      setMsg(null);
      setSearchHits([]);
      startTransition(() => {
        void (async () => {
          const r = await gameAdminGetUserByIdAction(userId);
          if (!r.ok) {
            setMsgOk(false);
            setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
            setCard(null);
            return;
          }
          setCard(r.user);
          setBanReasonDraft(r.user.banReason ?? "");
          setMsgOk(true);
          setMsg("Player loaded.");
        })();
      });
    },
    [showModeration],
  );

  useEffect(() => {
    if (!initialUserId || !showModeration) return;
    loadUserById(initialUserId);
  }, [initialUserId, showModeration, loadUserById]);

  function lookupEmail() {
    setMsg(null);
    setCard(null);
    setSearchHits([]);
    startTransition(() => {
      void (async () => {
        const r =
          authMode === "gameAdmin"
            ? await gameAdminLookupByEmailAction(emailQ)
            : await developerSupportLookupByEmailAction(emailQ);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        setCard(r.user);
        setBanReasonDraft(r.user.banReason ?? "");
        setMsgOk(true);
        setMsg("Player loaded.");
      })();
    });
  }

  function lookupCode() {
    setMsg(null);
    setCard(null);
    setSearchHits([]);
    startTransition(() => {
      void (async () => {
        const r =
          authMode === "gameAdmin"
            ? await gameAdminLookupByPublicCodeAction(codeQ)
            : await developerSupportLookupByPublicCodeAction(codeQ);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        setCard(r.user);
        setBanReasonDraft(r.user.banReason ?? "");
        setMsgOk(true);
        setMsg("Player loaded.");
      })();
    });
  }

  function searchPlayers() {
    if (!showModeration) return;
    setMsg(null);
    setCard(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminSearchPlayersAction(playerSearchQ);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          setSearchHits([]);
          return;
        }
        setSearchHits(r.users);
        setMsgOk(true);
        setMsg(
          r.users.length === 0
            ? "No matches."
            : `${r.users.length} match${r.users.length === 1 ? "" : "es"} — click one to open.`,
        );
      })();
    });
  }

  function runBan() {
    if (!card || !showModeration) return;
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminBanUserAction(card.id, banReasonDraft);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        loadUserById(card.id);
        setMsgOk(true);
        setMsg("User banned.");
      })();
    });
  }

  function runUnban() {
    if (!card || !showModeration) return;
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminUnbanUserAction(card.id);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        loadUserById(card.id);
        setMsgOk(true);
        setMsg("Ban removed.");
      })();
    });
  }

  function runMute() {
    if (!card || !showModeration) return;
    const h = Number.parseFloat(muteHours);
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminMuteUserAction(card.id, h);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        loadUserById(card.id);
        setMsgOk(true);
        setMsg("Mute applied.");
      })();
    });
  }

  function runUnmute() {
    if (!card || !showModeration) return;
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminUnmuteUserAction(card.id);
        if (!r.ok) {
          setMsgOk(false);
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        loadUserById(card.id);
        setMsgOk(true);
        setMsg("Mute cleared.");
      })();
    });
  }

  const btnPrimary =
    accent === "violet"
      ? "bg-violet-700 hover:bg-violet-600 text-white"
      : "bg-amber-600 hover:bg-amber-500 text-amber-950";
  const btnGhost =
    accent === "violet"
      ? "border-violet-600/60 text-violet-100 hover:bg-violet-950/80"
      : "border-amber-600/50 text-amber-100 hover:bg-amber-950/50";

  return (
    <div className="flex flex-col gap-3">
      {intro}

      {showModeration ? (
        <PanelSection title="Search players" accent={accent}>
          <label className="text-[10px] text-zinc-500">
            Name, email, or public code (partial match)
          </label>
          <div className="mt-0.5 flex gap-1">
            <input
              type="search"
              value={playerSearchQ}
              disabled={pending}
              onChange={(e) => setPlayerSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") searchPlayers();
              }}
              className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-100"
              placeholder="Search…"
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => searchPlayers()}
              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50 ${btnPrimary}`}
            >
              Search
            </button>
          </div>
          {searchHits.length > 0 ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-[10px]">
              {searchHits.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={pending}
                    className="w-full rounded border border-zinc-700 bg-zinc-900/80 px-2 py-1.5 text-left text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                    onClick={() => loadUserById(u.id)}
                  >
                    <span className="font-medium text-zinc-100">{u.displayName}</span>
                    <span className="block text-zinc-500">{u.email}</span>
                    <span className="font-mono text-zinc-600">{u.publicCode}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </PanelSection>
      ) : null}

      <PanelSection title="Find player" accent={accent}>
        <label className="text-[10px] text-zinc-500">Email</label>
        <div className="mt-0.5 flex gap-1">
          <input
            type="search"
            value={emailQ}
            disabled={pending}
            onChange={(e) => setEmailQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookupEmail();
            }}
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-100"
            placeholder="player@…"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => lookupEmail()}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50 ${btnPrimary}`}
          >
            Search
          </button>
        </div>
        <label className="mt-2 block text-[10px] text-zinc-500">
          Public code
        </label>
        <div className="mt-0.5 flex gap-1">
          <input
            type="search"
            value={codeQ}
            disabled={pending}
            onChange={(e) => setCodeQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookupCode();
            }}
            className="min-w-0 flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-1.5 text-[11px] text-zinc-100"
            placeholder="P-…"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => lookupCode()}
            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold disabled:opacity-50 ${btnGhost}`}
          >
            Search
          </button>
        </div>
      </PanelSection>

      {card ? (
        <PanelSection
          title={showModeration ? "Player" : "Player card (read-only)"}
          accent={accent}
        >
          <p className="text-[11px] font-medium text-zinc-100">
            {card.displayName}
          </p>
          <p className="mt-1 text-[10px] text-zinc-400">{card.email}</p>
          <p
            className={`mt-1 font-mono text-[10px] ${accent === "violet" ? "text-violet-300/90" : "text-amber-300/85"}`}
          >
            {card.publicCode}
          </p>
          <p className="mt-2 text-[10px] text-zinc-400">
            Status:{" "}
            <span className="font-medium text-zinc-200">
              {moderationStatusText(card)}
            </span>
          </p>
          {card.banReason ? (
            <p className="mt-1 text-[10px] text-red-300/90">
              Ban note: {card.banReason}
            </p>
          ) : null}
          <dl className="mt-2 space-y-1 text-[10px] text-zinc-500">
            <div>
              <dt className="inline text-zinc-600">Nation: </dt>
              <dd className="inline text-zinc-300">
                {card.nationName ?? "—"}
                {card.nationSlug ? ` · /nations/${card.nationSlug}` : ""}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-600">Party: </dt>
              <dd className="inline text-zinc-300">
                {card.partyLabel ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-600">Joined: </dt>
              <dd className="inline text-zinc-400">
                {new Date(card.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="inline text-zinc-600">Roles: </dt>
              <dd className="inline text-zinc-400">
                {[
                  card.hasDeveloperDock ? "Developer dock" : null,
                  card.hasGameAdminPanel ? "Game admin" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Player"}
              </dd>
            </div>
          </dl>
          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
              onClick={() => void copyText("user id", card.id)}
            >
              Copy id
            </button>
            <button
              type="button"
              className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
              onClick={() => void copyText("email", card.email)}
            >
              Copy email
            </button>
            <button
              type="button"
              className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
              onClick={() => void copyText("public code", card.publicCode)}
            >
              Copy code
            </button>
            {showModeration ? (
              <a
                href={`/admin/player/${card.id}`}
                className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-teal-300 hover:bg-zinc-800"
              >
                Open admin page
              </a>
            ) : null}
          </div>

          {showModeration ? (
            <div className="mt-3 space-y-2 border-t border-zinc-700 pt-3">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                Moderation
              </p>
              {card.bannedAt ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={runUnban}
                  className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-950/70 disabled:opacity-50"
                >
                  Unban
                </button>
              ) : (
                <div className="space-y-1">
                  <label className="block text-[10px] text-zinc-500">
                    Ban reason (optional)
                  </label>
                  <textarea
                    value={banReasonDraft}
                    disabled={pending}
                    onChange={(e) => setBanReasonDraft(e.target.value)}
                    rows={2}
                    className="w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
                    placeholder="Shown internally / support context"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={runBan}
                    className="rounded-lg border border-red-800/70 bg-red-950/50 px-2 py-1 text-[10px] font-semibold text-red-100 hover:bg-red-950/80 disabled:opacity-50"
                  >
                    Ban user
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500">Mute (hours)</label>
                  <input
                    type="number"
                    min={1}
                    max={8760}
                    value={muteHours}
                    disabled={pending}
                    onChange={(e) => setMuteHours(e.target.value)}
                    className="mt-0.5 w-20 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200"
                  />
                </div>
                <button
                  type="button"
                  disabled={pending || !!card.bannedAt}
                  onClick={runMute}
                  className="rounded-lg border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[10px] font-semibold text-amber-100 hover:bg-amber-950/70 disabled:opacity-50"
                >
                  Apply mute
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={runUnmute}
                  className="rounded-lg border border-zinc-600 px-2 py-1 text-[10px] text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
                >
                  Clear mute
                </button>
              </div>
              <p className="text-[9px] text-zinc-500">
                Muted users cannot upvote, join parties, or advance category votes. Banned users cannot sign in.
              </p>
            </div>
          ) : null}
        </PanelSection>
      ) : null}

      {msg ? (
        <p
          className={
            msgOk
              ? "text-[11px] text-emerald-400/90"
              : "text-[11px] text-red-300"
          }
          role="alert"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
