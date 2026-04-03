"use client";

import { useState } from "react";
import Link from "next/link";

export function FloatingTutorial() {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-4 z-40 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Tutorial
      </button>
    );
  }

  return (
    <aside className="fixed bottom-6 right-4 z-40 w-[min(100vw-2rem,320px)] rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          New here?
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          aria-label="Close tutorial"
        >
          ×
        </button>
      </div>
      <ol className="mt-3 list-decimal space-y-2 pl-4 text-zinc-600 dark:text-zinc-400">
        <li>
          Scan the radar and open a{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">category</strong>{" "}
          to view policies.
        </li>
        <li>
          Compare party cards against the{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">
            active baseline
          </strong>{" "}
          and read budget / tax hints.
        </li>
        <li>
          <strong className="text-zinc-800 dark:text-zinc-200">Guests</strong>{" "}
          can try votes; only{" "}
          <strong className="text-zinc-800 dark:text-zinc-200">logged-in</strong>{" "}
          players save monthly progress.
        </li>
        <li>
          Deep dives live in the{" "}
          <Link className="font-medium text-teal-700 underline dark:text-teal-400" href="/wiki">
            Wiki
          </Link>
          .
        </li>
      </ol>
    </aside>
  );
}
