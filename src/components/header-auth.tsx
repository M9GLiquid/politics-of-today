"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/types/game";

type Props = {
  session: SessionUser | null;
};

export function HeaderAuth({ session }: Props) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    router.push("/");
    router.refresh();
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          href="/register"
        >
          Register
        </Link>
        <Link
          className="rounded-full bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          href="/login"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[14rem] truncate text-xs text-zinc-500 sm:inline dark:text-zinc-400">
        <Link
          href="/profile"
          className="font-medium text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {session.name}
        </Link>
        <span className="ml-1 rounded bg-zinc-200 px-1 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {session.partyAffiliationLabel}
        </span>
        {session.adminMeta ? (
          <span
            className="ml-1 rounded bg-amber-200 px-1 py-0.5 text-[10px] font-semibold text-amber-950 dark:bg-amber-900/50 dark:text-amber-100"
            title="Administrator session preview active"
          >
            Preview
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-full border border-zinc-300 px-3 py-1.5 text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        Log out
      </button>
    </div>
  );
}
