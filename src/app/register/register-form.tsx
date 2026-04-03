"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";
import type { NationDTO } from "@/lib/nations";

type Props = { nations: NationDTO[] };

export function RegisterForm({ nations }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nationSlug, setNationSlug] = useState(nations[0]?.slug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email,
          password,
          displayName,
          nationSlug,
        }),
      });

      let message = `Something went wrong (${res.status}).`;
      try {
        const body = (await res.json()) as { error?: string; ok?: boolean };
        if (body.error) message = body.error;
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        setError(message);
        return;
      }

      // Full navigation so the Set-Cookie from the response is applied before the next page load.
      window.location.assign("/");
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (nations.length === 0) {
    return (
      <div className="mx-auto flex min-h-full max-w-md flex-col gap-6 px-4 py-16 font-sans">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
        >
          ← Home
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">No nations in the database yet.</p>
          <p className="mt-2">
            Run migrations and seed from the project folder:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-100">
            npx prisma migrate deploy{"\n"}npm run db:seed
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col gap-8 px-4 py-16 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Create account
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Pick one of five nations for the yearly competition. You vote only
          within your nation&apos;s party rankings and monthly ballots. You can
          switch nation after the calendar year ends.
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          <strong>Email</strong> must be unique (your login).{" "}
          <strong>Display name</strong> can match other people — you also get a
          unique <strong>player ID</strong> (P-…) after signup.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nation
          <select
            value={nationSlug}
            onChange={(e) => setNationSlug(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          >
            {nations.map((n) => (
              <option key={n.id} value={n.slug}>
                {n.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Display name
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
            minLength={2}
            autoComplete="nickname"
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
          />
        </label>
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
            minLength={4}
          />
        </label>
        {error ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {error.toLowerCase().includes("already registered") ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                <Link
                  href="/login"
                  className="font-medium text-teal-700 underline dark:text-teal-400"
                >
                  Go to log in
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending || !nationSlug}
          className="h-11 rounded-full bg-zinc-900 text-sm font-semibold text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Register & sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-teal-700 underline dark:text-teal-400"
        >
          Log in
        </Link>
      </p>
      <p className="text-center text-xs text-zinc-500">
        <Link href="/nations" className="underline">
          How nations compete this year →
        </Link>
      </p>
    </div>
  );
}
