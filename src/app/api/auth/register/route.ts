import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  applySessionCookieToResponse,
  canSignSessions,
  signSession,
} from "@/lib/auth";
import { buildSessionUserForUserId } from "@/lib/auth-session";
import { currentCalendarYear, getNationBySlug } from "@/lib/nations";
import { allocateUniqueUserPublicCode } from "@/lib/user-public-code";

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

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    nationSlug?: string;
  };
  try {
    body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      nationSlug?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const nationSlug =
    typeof body.nationSlug === "string" ? body.nationSlug.trim() : "";

  if (!email || !password || password.length < 4) {
    return NextResponse.json(
      { error: "Email and password (4+ chars) required." },
      { status: 400 },
    );
  }
  if (!displayName || displayName.length < 2) {
    return NextResponse.json(
      { error: "Display name is required (2+ characters)." },
      { status: 400 },
    );
  }
  if (!nationSlug) {
    return NextResponse.json(
      { error: "Choose a nation to join." },
      { status: 400 },
    );
  }

  const nation = await getNationBySlug(nationSlug);
  if (!nation) {
    return NextResponse.json({ error: "Unknown nation." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const year = currentCalendarYear();

  let user;
  try {
    const publicCode = await allocateUniqueUserPublicCode();
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        publicCode,
        displayName,
        role: "VOTER",
        nationId: nation.id,
        nationCommitYear: year,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = e.meta?.target;
      const fields = Array.isArray(target)
        ? target
        : target != null
          ? [String(target)]
          : [];
      const isEmail = fields.some((f) => f === "email");
      return NextResponse.json(
        {
          error: isEmail
            ? "That email is already registered. Log in instead."
            : "Could not create account (conflict). Try again.",
        },
        { status: 409 },
      );
    }
    throw e;
  }

  const sessionUser = await buildSessionUserForUserId(user.id);
  if (!sessionUser) {
    return NextResponse.json(
      { error: "Could not create session." },
      { status: 500 },
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

  const res = NextResponse.json({
    ok: true,
    playerCode: sessionUser.playerCode,
    user: {
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
    },
  });
  applySessionCookieToResponse(res, token);
  return res;
}
