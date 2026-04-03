"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { leaveParty } from "@/app/actions/party-member";

export function LeavePartyButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onLeave() {
    setMsg(null);
    startTransition(async () => {
      const res = await leaveParty();
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      router.refresh();
      router.push("/parties");
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={onLeave}
        className="text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
      >
        {pending ? "Leaving…" : "Leave party"}
      </button>
      {msg ? <p className="mt-1 text-xs text-red-600">{msg}</p> : null}
    </div>
  );
}
