"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { FiscalImpact } from "@/lib/budget";
import type { Party, Policy, SessionUser } from "@/types/game";
import { submitCategoryVote } from "@/app/actions/voting";
import { useRouter } from "next/navigation";

type Props = {
  policy: Policy;
  party?: Party;
  categorySlug: string;
  fiscal: FiscalImpact;
  session: SessionUser | null;
};

export function PolicyCard({
  policy,
  party,
  categorySlug,
  fiscal,
  session,
}: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function vote() {
    setMessage(null);
    if (!session) {
      setMessage("Log in to cast votes.");
      return;
    }
    if (!session.nationId) {
      setMessage(
        "Choose a nation first on your profile before votes can count.",
      );
      return;
    }
    startTransition(async () => {
      const res = await submitCategoryVote(categorySlug, policy.id);
      if (!res.ok && res.reason === "nation") {
        setMessage("Choose a nation on your profile before votes can count.");
        return;
      }
      if (!res.ok && res.reason === "policy") {
        setMessage(
          "That choice does not match this category. Refresh the page and try again.",
        );
        return;
      }
      if (!res.ok && res.reason === "category") {
        setMessage("Unknown category. Refresh the page.");
        return;
      }
      if (!res.ok && res.reason === "muted") {
        setMessage("Your account is muted — category votes are disabled for now.");
        return;
      }
      if (!res.ok && res.reason === "banned") {
        setMessage("Your account cannot vote.");
        return;
      }
      setMessage(
        "Vote saved for this month. It updates active law for your nation and the radar.",
      );
      router.refresh();
    });
  }

  const borderAccent = party?.accentColor ?? "#71717a";

  return (
    <article
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      style={{ borderTopWidth: 3, borderTopColor: borderAccent }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {party ? party.shortName : "National baseline"}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {policy.catchPhrase}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {policy.shortDescription}
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 self-start text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
      >
        {open ? "Hide full brief" : "Read full brief"}
      </button>
      {open ? (
        <p className="mt-2 border-l-2 border-teal-500 pl-3 text-sm leading-relaxed text-zinc-700 dark:border-teal-400 dark:text-zinc-300">
          {policy.longDescription}
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">
            Budget vs your nation&apos;s active line
          </dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {fiscal.deltaVsActive >= 0 ? "+" : ""}
            {fiscal.deltaVsActive.toFixed(2)} / yr (nation-scaled abstract bn)
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Time to complete</dt>
          <dd className="font-medium text-zinc-900 dark:text-zinc-100">
            {policy.monthsToComplete === 0
              ? "Already in force"
              : `${policy.monthsToComplete} months`}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-zinc-500 dark:text-zinc-400">Tax / revenue story</dt>
          <dd className="max-w-[18rem] text-right font-medium text-zinc-900 dark:text-zinc-100">
            {policy.taxNarrative}
          </dd>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            National envelope (toy model)
          </p>
          <p className="mt-1">{fiscal.summaryLine}</p>
          {fiscal.borrowingNeeded > 0 ? (
            <p className="mt-2 font-medium text-amber-800 dark:text-amber-200">
              Borrowing implied: {fiscal.borrowingNeeded.toFixed(0)} (abstract
              billions). Tax pressure index:{" "}
              {(fiscal.taxPressureIndex * 100).toFixed(0)}%
            </p>
          ) : null}
        </div>
      </dl>

      {policy.isContinuationOfStatusQuo ? (
        <p className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          This is the current active policy line—you can vote to keep it.
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {session ? (
          <button
            type="button"
            disabled={pending}
            onClick={vote}
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Saving…" : "Cast vote for this policy"}
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Log in to vote
          </Link>
        )}
      </div>
      {message ? (
        <p className="mt-3 text-sm text-teal-800 dark:text-teal-200">{message}</p>
      ) : null}
    </article>
  );
}
