function key(month: string): string {
  return `pot_guest_done_${month}`;
}

export function readGuestCompletedSlugs(month: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(key(month));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string");
  } catch {
    return [];
  }
}

/** Pass the same `votingMonth` the server uses (e.g. from RSC) so keys stay aligned. */
export function addGuestCompletedSlug(slug: string, month: string): void {
  const prev = readGuestCompletedSlugs(month);
  if (prev.includes(slug)) {
    window.dispatchEvent(new Event("pot-category-voted"));
    return;
  }
  sessionStorage.setItem(key(month), JSON.stringify([...prev, slug]));
  window.dispatchEvent(new Event("pot-category-voted"));
}
