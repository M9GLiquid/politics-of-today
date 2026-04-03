"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createPolicyDraft,
  publishDraft,
  voteForDraft,
} from "@/app/actions/party-drafts";

export type DraftRow = {
  id: string;
  catchPhrase: string;
  shortDescription: string;
  voteCount: number;
  createdByName: string;
};

export type CategoryDraftBlock = {
  categoryId: string;
  categoryName: string;
  drafts: DraftRow[];
  myPickDraftId: string | null;
};

type Props = {
  partyId: string;
  canDraft: boolean;
  canVote: boolean;
  canPublish: boolean;
  votingMonthLabel: string;
  categories: Array<{ id: string; name: string }>;
  blocks: CategoryDraftBlock[];
};

export function PartyPolicyDraftsPanel({
  partyId,
  canDraft,
  canVote,
  canPublish,
  votingMonthLabel,
  categories,
  blocks,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [catchPhrase, setCatchPhrase] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [longDescription, setLongDescription] = useState("");
  const [budgetDelta, setBudgetDelta] = useState("0");
  const [months, setMonths] = useState("12");
  const [taxNarrative, setTaxNarrative] = useState("");
  const [continuation, setContinuation] = useState(false);

  function submitDraft(e: FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    if (!catId) return;
    startTransition(async () => {
      const res = await createPolicyDraft({
        partyId,
        categoryId: catId,
        catchPhrase,
        shortDescription,
        longDescription,
        budgetDeltaVsActive: Number.parseFloat(budgetDelta) || 0,
        monthsToComplete: Number.parseInt(months, 10) || 0,
        taxNarrative,
        isContinuationOfStatusQuo: continuation,
      });
      if (!res.ok) {
        setFormMsg(res.error);
        return;
      }
      setCatchPhrase("");
      setShortDescription("");
      setLongDescription("");
      setBudgetDelta("0");
      setMonths("12");
      setTaxNarrative("");
      setContinuation(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-10 space-y-10">
      {formMsg ? (
        <p className="text-sm text-red-600 dark:text-red-400">{formMsg}</p>
      ) : null}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Policy drafts &amp; member primary
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <strong>PM, Vice-PM, and council</strong> submit competing drafts per
          category. <strong>Rank-and-file members</strong> pick one draft per
          category each month (<span className="font-mono">{votingMonthLabel}</span>
          , UTC). On the 1st of the following month, the top-voted draft per
          category becomes the party&apos;s published line for the national ballot.
        </p>
      </div>

      {canDraft ? (
        <form
          onSubmit={(e) => void submitDraft(e)}
          className="space-y-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
            New draft
          </h3>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Category</span>
            <select
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Catch phrase</span>
            <input
              value={catchPhrase}
              onChange={(e) => setCatchPhrase(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Short description</span>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Full brief</span>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Budget Δ vs baseline (abstract bn/yr)
              <input
                type="number"
                step="0.1"
                value={budgetDelta}
                onChange={(e) => setBudgetDelta(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="text-sm">
              Months to complete
              <input
                type="number"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
          <label className="block text-sm">
            Tax / revenue note
            <input
              value={taxNarrative}
              onChange={(e) => setTaxNarrative(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={continuation}
              onChange={(e) => setContinuation(e.target.checked)}
            />
            Continuation of status quo line
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Submit draft"}
          </button>
        </form>
      ) : null}

      {!canDraft && canVote ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You can vote for drafts below. Leadership roles cannot vote in the
          internal primary.
        </p>
      ) : null}

      <div className="space-y-8">
        {blocks.map((block) => (
          <section key={block.categoryId} className="rounded-xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
              {block.categoryName}
            </h3>
            {block.drafts.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-500">No drafts yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {block.drafts.map((d) => {
                  const isMyPick = block.myPickDraftId === d.id;
                  return (
                    <li key={d.id} className="px-4 py-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {d.catchPhrase}
                          </p>
                          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                            {d.shortDescription}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            By {d.createdByName} · {d.voteCount} vote
                            {d.voteCount === 1 ? "" : "s"}
                            {isMyPick ? (
                              <span className="ml-2 font-semibold text-teal-700 dark:text-teal-400">
                                · Your pick
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canVote ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  await voteForDraft(d.id);
                                  router.refresh();
                                });
                              }}
                              className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium dark:border-zinc-600"
                            >
                              {isMyPick ? "Voted" : "Vote for this"}
                            </button>
                          ) : null}
                          {canPublish ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => {
                                startTransition(async () => {
                                  const res = await publishDraft(d.id);
                                  if (!res.ok) {
                                    setFormMsg(res.error);
                                    return;
                                  }
                                  setFormMsg(null);
                                  router.refresh();
                                });
                              }}
                              className="rounded-full bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white dark:bg-teal-600"
                            >
                              Publish now
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
