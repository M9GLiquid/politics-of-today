import { getJwtSession } from "@/lib/auth";
import { isGameAdminUiEnabled, userIsGameAdministrator } from "@/lib/admin-preview";

/** Real JWT identity only (no dev preview lens). */
export async function viewerIsGameAdministrator(): Promise<boolean> {
  const jwt = await getJwtSession();
  if (!jwt || !isGameAdminUiEnabled()) return false;
  return userIsGameAdministrator(jwt.sub, jwt.email);
}
