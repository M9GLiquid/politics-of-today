import { NextResponse } from "next/server";
import { clearAdminPreviewCookieOnResponse } from "@/lib/admin-preview";
import { clearSessionCookieOnResponse } from "@/lib/auth";
import { clearVoteProgressCookieOnResponse } from "@/lib/progress";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookieOnResponse(res);
  clearVoteProgressCookieOnResponse(res);
  clearAdminPreviewCookieOnResponse(res);
  return res;
}
