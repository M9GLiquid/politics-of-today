"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerParty } from "@/app/actions/party-register";

export default function RegisterPartyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [accentColor, setAccentColor] = useState("#0d9488");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await registerParty({
        name,
        shortName,
        slugInput,
        accentColor,
        description,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
      router.push("/party");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col gap-8 px-4 py-16 font-sans">
      <Link
        href="/parties"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Parties
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Register a party
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          One party per account. You keep full voter privileges (category votes,
          upvotes). Campaign for upvotes to reach the top ballot.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Full name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
            minLength={2}
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Short name
          <input
            type="text"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="e.g. Greens"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          URL slug
          <input
            type="text"
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="letters-numbers-dashes"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Party description (min. 80 characters)
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you stand for, priorities, and how you govern internally…"
            rows={6}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
            minLength={80}
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Accent color
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="mt-2 h-10 w-20 cursor-pointer rounded border border-zinc-300 bg-white dark:border-zinc-700"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-zinc-900 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create party"}
        </button>
      </form>
    </div>
  );
}
