import { getJwtSession } from "@/lib/auth";
import { isGameAdminUiEnabled, userIsGameAdministrator } from "@/lib/admin-preview";

export async function requireGameAdminAccess(): Promise<
  | {
      ok: true;
      jwt: NonNullable<Awaited<ReturnType<typeof getJwtSession>>>;
    }
  | { ok: false; error: string }
> {
  const jwt = await getJwtSession();
  if (!jwt) return { ok: false, error: "auth" };
  if (!isGameAdminUiEnabled()) return { ok: false, error: "disabled" };
  if (!(await userIsGameAdministrator(jwt.sub, jwt.email))) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, jwt };
}
