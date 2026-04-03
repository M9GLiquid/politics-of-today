"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeNation } from "@/app/actions/change-nation";
import type { NationDTO } from "@/lib/nations";

type Props = {
  nations: NationDTO[];
  currentSlug: string | null;
  isInitialPick: boolean;
};

export function NationPickForm({
  nations,
  currentSlug,
  isInitialPick,
}: Props) {
  const router = useRouter();
  const [slug, setSlug] = useState(currentSlug ?? nations[0]?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await changeNation(slug);
      if (!res.ok) {
        if (res.error === "locked") {
          setError("You cannot change nation until the next calendar year.");
        } else if (res.error === "invalid") {
          setError("That nation is not valid.");
        } else {
          setError("Something went wrong.");
        }
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mt-6 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {isInitialPick ? "Select nation" : "Switch nation (year-end unlock)"}
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        >
          {nations.map((n) => (
            <option key={n.id} value={n.slug}>
              {n.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !slug}
        className="h-10 rounded-full bg-zinc-900 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending
          ? "Saving…"
          : isInitialPick
            ? "Confirm nation"
            : "Switch to selected nation"}
      </button>
    </form>
  );
}
