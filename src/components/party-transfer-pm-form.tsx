"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { transferPartyPm } from "@/app/actions/party-leadership";

type Row = { userId: string; displayName: string };

type Props = {
  partyId: string;
  members: Row[];
  selfUserId: string;
};

export function PartyTransferPmForm({ partyId, members, selfUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const choices = members.filter((m) => m.userId !== selfUserId);

  return (
    <form
      className="mt-4 space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      onSubmit={(e) => {
        e.preventDefault();
        if (!target) return;
        startTransition(async () => {
          setMsg(null);
          const res = await transferPartyPm({ partyId, newPmUserId: target });
          if (!res.ok) {
            setMsg(res.error);
            return;
          }
          setTarget("");
          router.refresh();
        });
      }}
    >
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Transfer PM role
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        The PM or founder can hand the PM seat to another member. You become a
        regular member afterward (if you have a membership row).
      </p>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        required
      >
        <option value="">Choose member…</option>
        {choices.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.displayName}
          </option>
        ))}
      </select>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending || !target}
        className="rounded-full border border-zinc-400 px-4 py-2 text-sm font-medium dark:border-zinc-600"
      >
        {pending ? "…" : "Transfer PM"}
      </button>
    </form>
  );
}
