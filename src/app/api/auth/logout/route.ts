import { NextResponse } from "next/server";
import { clearSessionCookieOnResponse } from "@/lib/auth";
import { clearVoteProgressCookieOnResponse } from "@/lib/progress";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookieOnResponse(res);
  clearVoteProgressCookieOnResponse(res);
  return res;
}
