import { useMemo, useSyncExternalStore } from "react";
import { readGuestCompletedSlugs } from "@/lib/guest-session";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = () => onChange();
  window.addEventListener("pot-category-voted", handler);
  return () => window.removeEventListener("pot-category-voted", handler);
}

/**
 * Session-only completion list for guests; server snapshot is always empty.
 */
export function useGuestCompletedSlugs(month: string): string[] {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => {
      const slugs = readGuestCompletedSlugs(month);
      return JSON.stringify([...slugs].sort());
    },
    () => "[]",
  );

  return useMemo(() => {
    try {
      const parsed = JSON.parse(snapshot) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((s): s is string => typeof s === "string");
    } catch {
      return [];
    }
  }, [snapshot]);
}
