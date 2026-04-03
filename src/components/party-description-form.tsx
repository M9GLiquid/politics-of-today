"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updatePartyDescription } from "@/app/actions/party-description";

type Props = {
  partyId: string;
  initialDescription: string;
};

export function PartyDescriptionForm({ partyId, initialDescription }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialDescription);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setMsg(null);
          const res = await updatePartyDescription(partyId, text);
          if (!res.ok) {
            setMsg(res.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Party description (min. 80 characters)
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>
      {msg ? <p className="text-sm text-red-600">{msg}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white dark:bg-teal-500"
      >
        {pending ? "Saving…" : "Save description"}
      </button>
    </form>
  );
}
