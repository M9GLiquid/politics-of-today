import { getJwtSession } from "@/lib/auth";
import {
  isDeveloperPreviewEnvironment,
  userIsDeveloper,
} from "@/lib/admin-preview";

export async function requireAdminDockAccess(): Promise<
  | {
      ok: true;
      jwt: NonNullable<Awaited<ReturnType<typeof getJwtSession>>>;
    }
  | { ok: false; error: string }
> {
  const jwt = await getJwtSession();
  if (!jwt) return { ok: false, error: "auth" };
  if (!isDeveloperPreviewEnvironment()) return { ok: false, error: "disabled" };
  if (!(await userIsDeveloper(jwt.sub, jwt.email))) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, jwt };
}
