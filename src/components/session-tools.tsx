"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  clearVoteProgressForDevice,
  refreshSessionFromDatabase,
} from "@/app/actions/session";

export function SessionTools() {
  const router = useRouter();
  const [busy, setBusy] = useState<"refresh" | "progress" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onRefreshSession() {
    setBusy("refresh");
    setMsg(null);
    const r = await refreshSessionFromDatabase();
    setBusy(null);
    if (r.ok) {
      setMsg("Session refreshed.");
      router.refresh();
    } else if (r.error === "not_signed_in") {
      setMsg("You are not signed in.");
    } else {
      setMsg("Could not refresh session. Try Log out, then log in again.");
    }
  }

  async function onClearVoteCookie() {
    setBusy("progress");
    setMsg(null);
    await clearVoteProgressForDevice();
    setBusy(null);
    setMsg("Vote progress cookie cleared for this device.");
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Session &amp; cookies
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        If the site acts like you are logged out, or nation/party in the header
        does not match what you expect, try refreshing the session. Use{" "}
        <strong className="font-medium text-zinc-800 dark:text-zinc-200">
          Log out
        </strong>{" "}
        in the header to clear login and voting-progress cookies on this device.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onRefreshSession()}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh session from server"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void onClearVoteCookie()}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          {busy === "progress" ? "Clearing…" : "Clear vote progress cookie"}
        </button>
      </div>
      {msg ? (
        <p className="mt-3 text-sm text-teal-800 dark:text-teal-300">{msg}</p>
      ) : null}
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        Sessions last about seven days per login. Deployments that change{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">AUTH_SECRET</code>{" "}
        invalidate existing cookies—log in again after that.
      </p>
    </section>
  );
}
