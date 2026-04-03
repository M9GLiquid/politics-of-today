import { GameAdminDock } from "@/components/game-admin-dock";
import {
  isGameAdminUiEnabled,
  userIsGameAdministrator,
} from "@/lib/admin-preview";
import { getJwtSession } from "@/lib/auth";

export async function GameAdminHost() {
  try {
    if (!isGameAdminUiEnabled()) return null;

    const jwtSession = await getJwtSession();
    if (!jwtSession) return null;

    const allowed = await userIsGameAdministrator(
      jwtSession.sub,
      jwtSession.email,
    );
    if (!allowed) return null;

    return <GameAdminDock staffEmail={jwtSession.email} />;
  } catch (err) {
    console.error("[GameAdminHost]", err);
    return null;
  }
}
