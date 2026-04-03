import Link from "next/link";
import { notFound } from "next/navigation";
import { GameAdminLookupPanel } from "@/components/game-admin-lookup-panel";
import { viewerIsGameAdministrator } from "@/lib/game-admin-viewer";

type Props = { params: Promise<{ userId: string }> };

export default async function GameAdminPlayerPage({ params }: Props) {
  const { userId } = await params;
  const allowed = await viewerIsGameAdministrator();
  if (!allowed) notFound();

  return (
    <div className="mx-auto max-w-lg px-4 py-10 font-sans">
      <Link
        href="/parties"
        className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
      >
        ← Parties
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Game admin — player
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Ban, mute, or look up this account. Use the violet game-admin panel on any page for the same tools.
      </p>
      <div className="mt-6">
        <GameAdminLookupPanel
          authMode="gameAdmin"
          accent="violet"
          initialUserId={userId}
        />
      </div>
    </div>
  );
}
