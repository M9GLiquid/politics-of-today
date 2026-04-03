const RESERVED = new Set(["system-baseline", "new", "register", "api"]);

export function slugifyPartySlug(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.slice(0, 48);
}

export function isReservedPartySlug(slug: string): boolean {
  return RESERVED.has(slug) || slug.startsWith("_");
}
