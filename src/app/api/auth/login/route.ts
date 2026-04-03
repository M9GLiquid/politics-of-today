import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  applySessionCookieToResponse,
  canSignSessions,
  signSession,
} from "@/lib/auth";
import { buildSessionUserForUserId } from "@/lib/auth-session";

export async function POST(request: Request) {
  if (!canSignSessions()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured to sign sessions. Set AUTH_SECRET (16+ characters) in .env and restart.",
      },
      { status: 500 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  if (user.bannedAt) {
    return NextResponse.json(
      { error: "This account has been suspended." },
      { status: 403 },
    );
  }

  const sessionUser = await buildSessionUserForUserId(user.id);
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  let token: string;
  try {
    token = await signSession(sessionUser);
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not sign session. Check AUTH_SECRET in .env (16+ characters).",
      },
      { status: 500 },
    );
  }

  const needsNationPick = !sessionUser.nationId;

  const res = NextResponse.json({
    ok: true,
    needsNationPick,
    user: {
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
    },
  });
  applySessionCookieToResponse(res, token);
  return res;
}
