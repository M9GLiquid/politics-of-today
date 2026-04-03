"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gameAdminDeletePartyAction } from "@/app/actions/game-admin-moderation";

type Props = {
  partyId: string;
  partyLabel: string;
  /** e.g. "compact" for list rows */
  variant?: "default" | "compact";
};

export function GameAdminDeletePartyButton({
  partyId,
  partyLabel,
  variant = "default",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onDelete() {
    const ok = window.confirm(
      `Remove party "${partyLabel}"? This deletes the party and related data (members, drafts, votes). This cannot be undone.`,
    );
    if (!ok) return;
    setMsg(null);
    startTransition(() => {
      void (async () => {
        const r = await gameAdminDeletePartyAction(partyId);
        if (!r.ok) {
          setMsg(r.error === "forbidden" ? "Not allowed." : r.error);
          return;
        }
        router.refresh();
        router.push("/parties");
      })();
    });
  }

  const btnClass =
    variant === "compact"
      ? "rounded-lg border border-red-800/70 px-2 py-1 text-[10px] font-semibold text-red-200 hover:bg-red-950/60 disabled:opacity-50"
      : "rounded-lg border border-red-800/80 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-950/70 disabled:opacity-50";

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button type="button" className={btnClass} disabled={pending} onClick={onDelete}>
        {pending ? "Removing…" : "Remove party (admin)"}
      </button>
      {msg ? (
        <span className="text-[10px] text-red-300" role="alert">
          {msg}
        </span>
      ) : null}
    </span>
  );
}
