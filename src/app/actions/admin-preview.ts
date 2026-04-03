"use server";

import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireAdminDockAccess } from "@/lib/admin-dock-gate";
import {
  clearAdminPreviewCookie,
  setAdminPreviewCookieState,
  type AdminPreviewCookieState,
} from "@/lib/admin-preview";
import { refreshJwtSessionCookie } from "@/lib/auth";
import { currentCalendarYear, getNationBySlug } from "@/lib/nations";
import { prisma } from "@/lib/prisma";
import { clearVoteProgressCookie } from "@/lib/progress";
import { allocateUniqueUserPublicCode } from "@/lib/user-public-code";

export async function applyAdminPreviewAction(
  state: AdminPreviewCookieState,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (state.impersonateUserId) {
    const row = await prisma.user.findUnique({
      where: { id: state.impersonateUserId },
      select: { id: true },
    });
    if (!row) return { ok: false, error: "user" };
  }

  await setAdminPreviewCookieState({
    sessionLens: state.sessionLens ?? "user",
    impersonateUserId: state.impersonateUserId || null,
    stripNation: state.stripNation === true,
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearAdminPreviewAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };
  await clearAdminPreviewCookie();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function refreshJwtSessionDockAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };
  const ok = await refreshJwtSessionCookie();
  if (!ok) return { ok: false, error: "Could not refresh JWT (signed out?)." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function clearVoteProgressDockAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };
  await clearVoteProgressCookie();
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function createBotUserAction(input: {
  displayName: string;
  email?: string;
  nationSlug: string;
  password?: string;
  isAdministrator?: boolean;
  isGameAdministrator?: boolean;
}): Promise<
  | {
      ok: true;
      userId: string;
      email: string;
      password: string;
      displayName: string;
    }
  | { ok: false; error: string }
> {
  const gate = await requireAdminDockAccess();
  if (!gate.ok) return { ok: false, error: gate.error };

  const displayName = input.displayName.trim();
  if (displayName.length < 2) {
    return { ok: false, error: "Display name must be at least 2 characters." };
  }

  const password =
    typeof input.password === "string" && input.password.trim().length >= 4
      ? input.password.trim()
      : "botplay1";

  let email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email) {
    email = `bot-${randomBytes(5).toString("hex")}@debug.local`;
  }
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) {
    return { ok: false, error: "Invalid email (need user@domain)." };
  }
  const domain = email.slice(at + 1);
  if (!domain.includes(".")) {
    return { ok: false, error: "Invalid email (domain needs a dot, e.g. .local)." };
  }

  const nationSlug = input.nationSlug.trim();
  let nationId: string | null = null;
  let nationCommitYear: number | null = null;
  if (nationSlug) {
    const nation = await getNationBySlug(nationSlug);
    if (!nation) return { ok: false, error: "Unknown nation." };
    nationId = nation.id;
    nationCommitYear = currentCalendarYear();
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const publicCode = await allocateUniqueUserPublicCode();
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        publicCode,
        displayName,
        role: "VOTER",
        nationId,
        nationCommitYear,
        isAdministrator: input.isAdministrator === true,
        isGameAdministrator: input.isGameAdministrator === true,
      },
    });
    revalidatePath("/", "layout");
    return {
      ok: true,
      userId: user.id,
      email,
      password,
      displayName,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return {
        ok: false,
        error:
          "Email already taken. Clear the email field to auto-generate another.",
      };
    }
    throw e;
  }
}
