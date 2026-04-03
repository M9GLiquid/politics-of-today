"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";

type Props = { nextPath: string | null };

export function LoginClient({ nextPath }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as {
        error?: string;
        needsNationPick?: boolean;
      };
      if (!res.ok) {
        setError(body.error ?? "Login failed");
        return;
      }
      if (body.needsNationPick) {
        window.location.assign("/account/nation");
        return;
      }
      window.location.assign(nextPath ?? "/");
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
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
          Log in
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          One account: monthly category votes, party upvotes, and your own party
          (optional)—same login for everything.
        </p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
          <input
            type="email"
            autoComplete="username"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            required
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
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-center text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="font-medium text-teal-700 underline dark:text-teal-400">
          Register
        </Link>
      </p>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
          Seed voters (after <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">npm run db:seed</code>)
        </p>
        <p>alice@play.test / play · bob@play.test / play</p>
        <p className="mt-3 font-semibold text-zinc-800 dark:text-zinc-200">
          Synthetic party founders and members (password{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">seedseed</code>)
        </p>
        <p>
          seed-founder-0@fake.seed … seed-founder-24@fake.seed (each PM of seed-party-0 … 24)
        </p>
        <p>seed-member-0@fake.seed … seed-member-24@fake.seed (joined a party)</p>
      </div>
    </div>
  );
}
