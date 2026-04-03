"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleAllowMemberJoin } from "@/app/actions/party-member";

type Props = {
  partyId: string;
  initialValue: boolean;
};

export function AllowMemberJoinToggle({ partyId, initialValue }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    startTransition(async () => {
      const res = await toggleAllowMemberJoin(partyId, next);
      if (res.ok) {
        setValue(res.allowMemberJoin);
        router.refresh();
      }
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-400"
      />
      <span>
        Allow voters to <strong>join</strong> this party as members (one party
        per account).
      </span>
    </label>
  );
}
