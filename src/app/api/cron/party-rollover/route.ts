import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyLeadershipElectionResults } from "@/lib/party-leadership-apply";
import { promoteWinningDraftsForMonth } from "@/lib/party-promote-drafts";
import {
  previousLeadershipPeriodKey,
  utcMonthKey,
} from "@/lib/party-months";

/**
 * Run on the 1st of each month (UTC): promote top-voted drafts into published policies.
 * On quarter starts (Jan/Apr/Jul/Oct 1), also finalize the previous quarter leadership ballot.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publishMonth = utcMonthKey();
  const draftRes = await promoteWinningDraftsForMonth(publishMonth);

  const d = new Date();
  let leadershipPeriod: string | null = null;
  if (d.getUTCDate() === 1 && d.getUTCMonth() % 3 === 0) {
    leadershipPeriod = previousLeadershipPeriodKey(d);
    await applyLeadershipElectionResults(leadershipPeriod);
  }

  revalidatePath("/", "layout");
  revalidatePath("/parties");
  revalidatePath("/party");

  return NextResponse.json({
    ok: true,
    publishMonth,
    categoriesPromoted: draftRes.categoriesTouched,
    leadershipFinalized: leadershipPeriod,
  });
}
