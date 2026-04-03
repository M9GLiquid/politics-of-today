"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { reconcileSessionCookie } from "@/app/actions/change-nation";
import { purgeOrphanSessionCookie } from "@/app/actions/session";

/** Once per full load: drop orphan JWTs (no DB user), then sync nation/party into cookie. */
export function SessionReconcile() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void (async () => {
      const { purged } = await purgeOrphanSessionCookie();
      const { updated } = await reconcileSessionCookie();
      if (purged || updated) {
        router.refresh();
      }
    })();
  }, [router]);

  return null;
}
