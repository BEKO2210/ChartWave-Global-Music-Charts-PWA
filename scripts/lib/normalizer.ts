// ── Data normalization utilities ─────────────────────────────────────
// Cleans and normalizes data from various API sources before output.

/**
 * Normalize an artist name for consistent display and matching.
 * Trims whitespace and collapses internal whitespace.
 */
export function normalizeArtistName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Normalize a track title for consistent display.
 * Trims whitespace and collapses internal whitespace.
 */
export function normalizeTrackTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

/**
 * Build a search term for the iTunes API from artist + track.
 * Strips problematic characters that confuse the search API.
 */
export function buildSearchTerm(artist: string, track: string): string {
  const clean = (s: string): string =>
    s
      .replace(/[()[\]{}<>]/g, '')
      .replace(/feat\..*/i, '')
      .replace(/ft\..*/i, '')
      .replace(/&/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return `${clean(artist)} ${clean(track)}`;
}

/**
 * Transform an iTunes artwork URL to a specific size.
 * iTunes URLs contain "100x100bb" or similar; we replace with the desired dimensions.
 *
 * @param url The original iTunes artwork URL
 * @param size The desired pixel size (e.g. 100, 300, 600)
 * @returns The resized artwork URL
 */
export function resizeArtwork(url: string, size: number): string {
  return url.replace(/\d+x\d+bb/, `${size}x${size}bb`);
}

/**
 * Build artwork object from an iTunes artwork URL.
 * Returns small (100px), medium (300px), large (600px) sizes plus a placeholder color.
 */
export function buildArtworkFromItunes(artworkUrl: string): ArtworkUrls {
  return {
    small: resizeArtwork(artworkUrl, 100),
    medium: resizeArtwork(artworkUrl, 300),
    large: resizeArtwork(artworkUrl, 600),
    placeholder: '#1a1a2e',
  };
}

/**
 * Build a fallback artwork object using Last.fm image URLs.
 * Last.fm provides small/medium/large/extralarge images in their response.
 */
export function buildArtworkFromLastfm(
  images: Array<{ '#text': string; size: string }>
): ArtworkUrls {
  const findImage = (size: string): string => {
    const img = images.find((i) => i.size === size);
    return img?.['#text'] || '';
  };

  const large = findImage('extralarge') || findImage('large') || '';
  const medium = findImage('large') || findImage('medium') || '';
  const small = findImage('medium') || findImage('small') || '';

  return {
    small: small || `https://via.placeholder.com/100x100/1a1a2e/ffffff?text=No+Art`,
    medium: medium || `https://via.placeholder.com/300x300/1a1a2e/ffffff?text=No+Art`,
    large: large || `https://via.placeholder.com/600x600/1a1a2e/ffffff?text=No+Art`,
    placeholder: '#1a1a2e',
  };
}

/**
 * Safely parse a numeric value from Last.fm responses.
 * Returns 0 if parsing fails.
 */
export function safeParseInt(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === 'number' ? value : parseInt(String(value), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse duration from milliseconds (iTunes) to seconds.
 */
export function msToSeconds(ms: number | undefined): number | undefined {
  if (ms === undefined || ms <= 0) return undefined;
  return Math.round(ms / 1000);
}

/**
 * Determine rank change status comparing current rank to previous.
 */
export function computeRankChange(
  currentRank: number,
  previousRank: number | undefined
): { rankChange: RankChange; rankDelta: number | undefined } {
  if (previousRank === undefined) {
    return { rankChange: 'new', rankDelta: undefined };
  }

  const delta = previousRank - currentRank;

  if (delta > 0) {
    return { rankChange: 'up', rankDelta: delta };
  } else if (delta < 0) {
    return { rankChange: 'down', rankDelta: delta };
  }

  return { rankChange: 'same', rankDelta: 0 };
}

// ── Inline types (no Astro imports) ─────────────────────────────────

export interface ArtworkUrls {
  small: string;
  medium: string;
  large: string;
  placeholder: string;
}

export type RankChange = 'up' | 'down' | 'same' | 'new';
