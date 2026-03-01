// ── Slug utility ─────────────────────────────────────────────────────
// Converts strings to URL-safe slugs for IDs and paths.

/**
 * Convert a string to a URL-safe slug.
 * Handles unicode, special characters, and edge cases.
 *
 * @example slugify("Billie Eilish") => "billie-eilish"
 * @example slugify("AC/DC") => "ac-dc"
 * @example slugify("Guns N' Roses") => "guns-n-roses"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                   // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')    // remove diacritical marks
    .toLowerCase()
    .trim()
    .replace(/&/g, '-and-')             // & => -and-
    .replace(/['']/g, '')               // remove apostrophes
    .replace(/[^a-z0-9\s-]/g, ' ')     // non-alphanumeric => space
    .replace(/\s+/g, '-')              // spaces => hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
}

/**
 * Generate a track ID from artist + title.
 *
 * @example trackId("Billie Eilish", "BIRDS OF A FEATHER") => "billie-eilish--birds-of-a-feather"
 */
export function trackId(artist: string, title: string): string {
  return `${slugify(artist)}--${slugify(title)}`;
}
