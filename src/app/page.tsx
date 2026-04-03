import Link from "next/link";
import { NationFiscalCarousel } from "@/components/nation-fiscal-carousel";
import { radarBudgetRowsForCategories } from "@/lib/budget-radar";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import {
  activeLawBudgetDeltasByNationForYear,
  mergeActiveLawDeltasForNation,
} from "@/lib/db/active-law";
import { getStatusQuoBudgetDeltaByCategoryId } from "@/lib/db/policies";
import { getSession } from "@/lib/auth";
import {
  listNationsOrdered,
  voterNeedsNationPick,
} from "@/lib/nations";
import { computeNationalAnnualEnvelopesForOrderedNations } from "@/lib/national-economy";
import {
  currentVotingMonth,
  getServerVoteProgress,
  yearFromVotingMonth,
} from "@/lib/progress";

export default async function Home() {
  const session = await getSession();
  const progress = await getServerVoteProgress(session?.nationId);
  const categories = await listCategoriesOrdered();
  const nations = await listNationsOrdered();
  const nationIds = nations.map((n) => n.id);
  const envelopes = await computeNationalAnnualEnvelopesForOrderedNations(
    nationIds,
  );
  const lawYear = yearFromVotingMonth(currentVotingMonth());
  const [statusQuoDeltas, activeByNation] = await Promise.all([
    getStatusQuoBudgetDeltaByCategoryId(),
    activeLawBudgetDeltasByNationForYear(lawYear, categories),
  ]);
  const nationSnapshots = await Promise.all(
    nations.map(async (n, i) => {
      const envelope = envelopes[i]!;
      const merged = mergeActiveLawDeltasForNation(
        activeByNation.get(n.id),
        statusQuoDeltas,
        categories,
      );
      return {
        nationId: n.id,
        slug: n.slug,
        name: n.name,
        fiscalEnvelope: envelope,
        radarRows: await radarBudgetRowsForCategories(
          categories,
          envelope.totalAnnual,
          merged,
        ),
      };
    }),
  );

  const guestMode =
    !session || (session.role === "voter" && !session.nationId);
  const completedSlugsServer =
    session?.role === "voter" && session.nationId != null
      ? progress.completedSlugs
      : [];

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        <section className="flex-1">
          <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase dark:text-teal-400">
            Monthly policy game
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Politics of Today
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Join one of five nations for the yearly run. Party rankings and
            ballots count upvotes only from your nation; switch nation after the
            calendar year ends. Guests preview in-session only. Swipe the radar
            or use the arrows to compare each nation&apos;s budget.
          </p>
          {session && voterNeedsNationPick(session.role, session.nationId) ? (
            <p className="mt-4 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Choose a nation to unlock votes that count for your team.{" "}
              <Link
                href="/account/nation"
                className="font-semibold text-teal-800 underline dark:text-teal-300"
              >
                Set your nation →
              </Link>
            </p>
          ) : null}
        </section>
        <section className="flex w-full min-w-0 flex-1 justify-center lg:max-w-xl">
          <NationFiscalCarousel
            key={session?.nationId ?? "no-nation"}
            snapshots={nationSnapshots}
            initialNationId={session?.nationId ?? null}
            completedSlugsServer={completedSlugsServer}
            votingMonth={progress.month}
            guestMode={guestMode}
          />
        </section>
      </div>
    </div>
  );
}
