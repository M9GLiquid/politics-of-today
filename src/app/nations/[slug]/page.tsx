import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryRadar } from "@/components/category-radar";
import { radarBudgetRowsForCategories } from "@/lib/budget-radar";
import { getSession } from "@/lib/auth";
import { listCategoriesOrdered } from "@/lib/db/catalog";
import {
  activeLawBudgetDeltasByNationForYear,
  mergeActiveLawDeltasForNation,
} from "@/lib/db/active-law";
import { getStatusQuoBudgetDeltaByCategoryId } from "@/lib/db/policies";
import {
  currentCalendarYear,
  getNationBySlug,
} from "@/lib/nations";
import { computeNationalAnnualEnvelope } from "@/lib/national-economy";
import {
  currentVotingMonth,
  getServerVoteProgress,
  yearFromVotingMonth,
} from "@/lib/progress";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export default async function NationDetailPage({ params }: Props) {
  const { slug } = await params;
  const nation = await getNationBySlug(slug);
  if (!nation) notFound();

  const session = await getSession();
  const year = currentCalendarYear();
  const lawYear = yearFromVotingMonth(currentVotingMonth());

  const categories = await listCategoriesOrdered();
  const [fiscalEnvelope, statusQuoDeltas, activeByNation, voterRow, voteRow] =
    await Promise.all([
      computeNationalAnnualEnvelope({ nationId: nation.id }),
      getStatusQuoBudgetDeltaByCategoryId(),
      activeLawBudgetDeltasByNationForYear(lawYear, categories),
      prisma.user.count({
        where: { role: "VOTER", nationId: nation.id },
      }),
      prisma.userCategoryMonthVote.count({
        where: { nationId: nation.id, year },
      }),
    ]);

  const mergedRadar = mergeActiveLawDeltasForNation(
    activeByNation.get(nation.id),
    statusQuoDeltas,
    categories,
  );
  const radarRows = await radarBudgetRowsForCategories(
    categories,
    fiscalEnvelope.totalAnnual,
    mergedRadar,
  );

  const isViewerNation = session?.nationId === nation.id;
  const progress = await getServerVoteProgress(session?.nationId);
  const guestMode = !isViewerNation || session?.nationId == null;
  const completedSlugsServer =
    isViewerNation && session?.nationId != null ? progress.completedSlugs : [];

  const engagement =
    voterRow > 0 ? Math.round((voteRow / voterRow) * 100) / 100 : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 font-sans">
      <Link
        href="/nations"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Nations
      </Link>

      <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          {nation.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Fiscal numbers match the home radar: shared reference tax and trade
          flows, a per-voter contribution curve for this nation, and{" "}
          <strong>active law</strong> from recorded policy votes this voting year
          (plurality by category).
        </p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
          {voterRow} voter{voterRow === 1 ? "" : "s"} · {voteRow} category-month
          vote{voteRow === 1 ? "" : "s"} in {year} · {engagement.toFixed(1)}{" "}
          votes / voter (avg.)
        </p>
      </header>

      <section className="mt-10 flex min-w-0 justify-center">
        <CategoryRadar
          radarRows={radarRows}
          fiscalEnvelope={fiscalEnvelope}
          completedSlugsServer={completedSlugsServer}
          votingMonth={progress.month}
          guestMode={guestMode}
        />
      </section>
    </div>
  );
}
