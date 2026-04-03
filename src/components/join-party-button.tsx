"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinParty } from "@/app/actions/party-member";

type Props = {
  partyId: string;
  disabled: boolean;
  disabledHint?: string;
};

export function JoinPartyButton({ partyId, disabled, disabledHint }: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onJoin() {
    setMsg(null);
    startTransition(async () => {
      const res = await joinParty(partyId);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={onJoin}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Joining…" : "Join party"}
      </button>
      {disabled && disabledHint ? (
        <span className="text-xs text-zinc-500">{disabledHint}</span>
      ) : null}
      {msg ? <span className="text-xs text-red-600 dark:text-red-400">{msg}</span> : null}
    </div>
  );
}
