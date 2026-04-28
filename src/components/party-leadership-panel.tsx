"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  toggleCouncilLeadershipVote,
  voteLeadershipOffice,
} from "@/app/actions/party-leadership";
import {
  COUNCIL_SEATS,
  MAX_COUNCIL_VOTES_PER_VOTER,
  formatPartyRankForDisplay,
} from "@/lib/party-ranks";

export type LeadershipRosterRow = {
  userId: string;
  displayName: string;
  rank: string;
};

type Props = {
  partyId: string;
  periodKey: string;
  canVote: boolean;
  roster: LeadershipRosterRow[];
  selfUserId: string;
  pmPick: string | null;
  vicePick: string | null;
  councilPicks: string[];
};

export function PartyLeadershipPanel({
  partyId,
  canVote,
  roster,
  selfUserId,
  pmPick,
  vicePick,
  councilPicks,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const candidates = roster.filter((r) => r.userId !== selfUserId);

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Leadership election
      </h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Members vote for PM, Vice-PM, and up to {MAX_COUNCIL_VOTES_PER_VOTER} council endorsements. The top {COUNCIL_SEATS} council candidates are seated.
      </p>

      {!canVote ? (
        <p className="mt-4 text-sm text-zinc-500">
          Voting is available to party members with the <strong>Member</strong> rank.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Vote for PM
            </label>
            <select
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              defaultValue={pmPick ?? ""}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                startTransition(async () => {
                  setMsg(null);
                  const res = await voteLeadershipOffice({
                    partyId,
                    office: "PM",
                    candidateUserId: v,
                  });
                  if (!res.ok) setMsg(res.error);
                  router.refresh();
                });
              }}
            >
              <option value="">Select candidate…</option>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.displayName} ({formatPartyRankForDisplay(c.rank)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Vote for Vice-PM
            </label>
            <select
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              defaultValue={vicePick ?? ""}
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                startTransition(async () => {
                  setMsg(null);
                  const res = await voteLeadershipOffice({
                    partyId,
                    office: "VICE_PM",
                    candidateUserId: v,
                  });
                  if (!res.ok) setMsg(res.error);
                  router.refresh();
                });
              }}
            >
              <option value="">Select candidate…</option>
              {candidates.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.displayName} ({formatPartyRankForDisplay(c.rank)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Council endorsements ({councilPicks.length}/
              {MAX_COUNCIL_VOTES_PER_VOTER})
            </p>
            <ul className="mt-2 space-y-2">
              {candidates.map((c) => {
                const on = councilPicks.includes(c.userId);
                return (
                  <li key={c.userId}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={pending}
                        onChange={() => {
                          startTransition(async () => {
                            setMsg(null);
                            const res = await toggleCouncilLeadershipVote({
                              partyId,
                              candidateUserId: c.userId,
                            });
                            if (!res.ok) setMsg(res.error);
                            router.refresh();
                          });
                        }}
                      />
                      {c.displayName} ({formatPartyRankForDisplay(c.rank)})
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {msg ? (
            <p className="text-sm text-red-600 dark:text-red-400">{msg}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
