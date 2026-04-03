import type { SessionUser } from "@/types/game";

/** Label for the header nation chip (logged-in users). */
export function nationHeaderLabel(s: Pick<SessionUser, "nationName" | "nationSlug">): string {
  if (s.nationName) return s.nationName;
  if (s.nationSlug) {
    return s.nationSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return "";
}
