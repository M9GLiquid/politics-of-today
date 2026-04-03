"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { togglePartyUpvote } from "@/app/actions/party-upvote";

type Props = {
  partyId: string;
  initialCount: number;
  initialUpvoted: boolean;
  disabled: boolean;
  /** Shown under the button when disabled (e.g. auth vs nation). */
  disabledHint?: string;
};

export function PartyUpvoteButton({
  partyId,
  initialCount,
  initialUpvoted,
  disabled,
  disabledHint,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hint, setHint] = useState<string | null>(null);

  function onClick() {
    if (disabled) return;
    setHint(null);
    startTransition(async () => {
      const res = await togglePartyUpvote(partyId);
      if (!res.ok && res.error === "nation") {
        setHint("Choose a nation (Account) to upvote.");
        return;
      }
      if (!res.ok && res.error === "muted") {
        setHint("Your account is muted — upvoting is disabled for now.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onClick}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
          initialUpvoted
            ? "bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
            : "border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
        }`}
      >
        {pending ? "…" : initialUpvoted ? "Upvoted" : "Upvote"}
      </button>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {initialCount} upvote{initialCount === 1 ? "" : "s"}
      </span>
      {disabled && disabledHint ? (
        <span className="max-w-[10rem] text-right text-[10px] text-zinc-400">
          {disabledHint}
        </span>
      ) : null}
      {hint ? (
        <span className="max-w-[10rem] text-right text-[10px] text-amber-700 dark:text-amber-300">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
