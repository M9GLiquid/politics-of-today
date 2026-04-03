"use client";

import { GameAdminLookupPanel } from "@/components/game-admin-lookup-panel";

type Props = {
  staffEmail: string;
};

export function GameAdminDock({ staffEmail }: Props) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[100] flex max-w-sm flex-col items-start gap-2">
      <div
        className="pointer-events-auto max-h-[min(82vh,34rem)] w-[min(calc(100vw-2rem),22rem)] overflow-y-auto rounded-2xl border border-violet-500/55 bg-zinc-950/95 p-4 text-xs text-zinc-100 shadow-xl backdrop-blur dark:border-violet-400/45"
        role="region"
        aria-label="Game administrator"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-300">
              Game admin
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
              Support &amp; moderation — you always act as{" "}
              <span className="text-zinc-300">{staffEmail}</span>. No guest/user
              simulation.
            </p>
          </div>
          <span
            className="shrink-0 rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-medium text-violet-200"
            title="Staff session"
          >
            Staff
          </span>
        </div>

        <div className="mt-3">
          <GameAdminLookupPanel
            authMode="gameAdmin"
            accent="violet"
            intro={
              <p className="text-[10px] text-zinc-500">
                Signed in as staff:{" "}
                <span className="text-zinc-300">{staffEmail}</span>
              </p>
            }
          />
        </div>

        <p className="mt-3 border-t border-zinc-800 pt-3 text-[10px] leading-relaxed text-zinc-600">
          Enable with{" "}
          <code className="rounded bg-zinc-800 px-1 text-zinc-400">
            GAME_ADMIN_UI_ENABLED=true
          </code>{" "}
          and set <code className="rounded bg-zinc-800 px-1">isGameAdministrator</code>{" "}
          on your user in the database.
        </p>
      </div>
    </div>
  );
}
