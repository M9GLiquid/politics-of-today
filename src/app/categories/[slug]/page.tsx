import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { TOP_PARTY_BALLOT_SIZE } from "@/lib/constants";
import { getCategoryBySlugDb, listCategoriesOrdered } from "@/lib/db/catalog";
import {
  activePolicySlugRecord,
  mergedCategoryBudgetDeltasForNation,
} from "@/lib/db/active-law";
import {
  getActiveBaselinePolicyIdsByCategorySlug,
  getStatusQuoBudgetDeltaByCategoryId,
  listPoliciesForCategoryBallot,
} from "@/lib/db/policies";
import { categoryAnnualSpendBySlug } from "@/lib/data/ledger";
import {
  computeFiscalImpact,
  scaleFiscalMagnitude,
  scaledNationalLedger,
} from "@/lib/budget";
import { computeNationalAnnualEnvelope } from "@/lib/national-economy";
import { PolicyCard } from "@/components/policy-card";
import { currentVotingMonth, yearFromVotingMonth } from "@/lib/progress";

type PageProps = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlugDb(slug);
  if (!category) notFound();

  const session = await getSession();

  if (session && !session.nationId) {
    return (
      <div className="mx-auto min-h-full max-w-3xl px-4 py-10 font-sans">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Radar home
        </Link>
        <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
            Category
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {category.name}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Choose a nation to open your national ballot and fiscal model. Your
            votes set <strong>active law</strong> for your nation (plurality this
            calendar year) and shift category spend on the home radar.
          </p>
          <p className="mt-4">
            <Link
              href="/profile"
              className="font-semibold text-teal-700 underline dark:text-teal-400"
            >
              Open profile →
            </Link>
          </p>
        </header>
      </div>
    );
  }

  const ballotNationId = session?.nationId ?? null;
  const month = currentVotingMonth();
  const year = yearFromVotingMonth(month);

  const [list, categories, baselineBySlug, statusQuo, nationalEnvelope] =
    await Promise.all([
      listPoliciesForCategoryBallot(category.id, ballotNationId),
      listCategoriesOrdered(),
      getActiveBaselinePolicyIdsByCategorySlug(),
      getStatusQuoBudgetDeltaByCategoryId(),
      computeNationalAnnualEnvelope(
        session?.nationId ? { nationId: session.nationId } : {},
      ),
    ]);

  const { merged: categoryDeltaMap, winners } =
    await mergedCategoryBudgetDeltasForNation(
      session?.nationId,
      year,
      categories,
      statusQuo,
    );

  const activePolicyByCategory = activePolicySlugRecord(
    winners,
    categories,
    baselineBySlug,
  );

  const ledger = scaledNationalLedger(
    nationalEnvelope.totalAnnual,
    activePolicyByCategory,
  );

  const dA = categoryDeltaMap.get(category.id) ?? 0;
  const base = categoryAnnualSpendBySlug[category.slug] ?? 0;
  const activeSpend = scaleFiscalMagnitude(
    base + dA,
    nationalEnvelope.totalAnnual,
  );
  return (
    <div className="mx-auto min-h-full max-w-3xl px-4 py-10 font-sans">
      <Link
        href="/"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Radar home
      </Link>
      <header className="mt-6 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          Category
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {category.name}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cards include the <strong>national baseline</strong> plus proposals from
          the top {TOP_PARTY_BALLOT_SIZE} parties by upvotes{" "}
          {session?.nationId ? (
            <>in your nation</>
          ) : (
            <>globally (guest preview)</>
          )}
          . Fiscal numbers use{" "}
          {session?.nationId ? (
            <>
              your nation&apos;s envelope and <strong>active law</strong>{" "}
              (policies with the most recorded votes this year, by category).
            </>
          ) : (
            <>the combined voter pool and global status-quo baselines.</>
          )}{" "}
          — see{" "}
          <Link
            href="/parties"
            className="font-medium text-teal-700 underline dark:text-teal-400"
          >
            Parties
          </Link>
          . Card deltas are vs active law in this category.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        {list.map(({ policy, party }) => {
          const dX = policy.budgetDeltaVsActive;
          const fiscal = computeFiscalImpact(
            ledger,
            activeSpend,
            scaleFiscalMagnitude(
              dX - dA,
              nationalEnvelope.totalAnnual,
            ),
          );
          return (
            <PolicyCard
              key={policy.id}
              policy={policy}
              party={party ?? undefined}
              categorySlug={category.slug}
              fiscal={fiscal}
              session={session}
            />
          );
        })}
      </div>
    </div>
  );
}
