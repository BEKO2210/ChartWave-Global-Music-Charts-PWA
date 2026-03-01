// ── iTunes Search API client ─────────────────────────────────────────
// Enriches tracks with artwork, preview URLs, and album info from iTunes.

import { logger } from './logger.js';
import { buildSearchTerm } from './normalizer.js';

const SEARCH_URL = 'https://itunes.apple.com/search';

/** Delay between iTunes requests to respect rate limits. */
const RATE_LIMIT_MS = 200;

// ── Response types ──────────────────────────────────────────────────

export interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  artworkUrl100: string;
  previewUrl?: string;
  trackViewUrl?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  releaseDate?: string;
  isStreamable?: boolean;
  trackExplicitness?: string;
}

interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesResult[];
}

// ── Client ──────────────────────────────────────────────────────────

export class ItunesClient {
  private lastRequestTime = 0;
  private readonly retries: number;
  private readonly country: string;

  constructor(options?: { retries?: number; country?: string }) {
    this.retries = options?.retries ?? 2;
    this.country = options?.country ?? 'us';
  }

  /**
   * Throttle requests to respect iTunes rate limiting.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await sleep(RATE_LIMIT_MS - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Search iTunes for a track by artist and title.
   * Returns the best match or null if not found.
   */
  async searchTrack(
    artist: string,
    title: string
  ): Promise<ItunesResult | null> {
    const term = buildSearchTerm(artist, title);
    logger.debug(`iTunes search: "${term}"`, 'itunes');

    await this.throttle();

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const url = new URL(SEARCH_URL);
        url.searchParams.set('term', term);
        url.searchParams.set('media', 'music');
        url.searchParams.set('entity', 'song');
        url.searchParams.set('limit', '5');
        url.searchParams.set('country', this.country);

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'ChartWave/1.0 (chart-fetcher)',
          },
        });

        if (response.status === 403 || response.status === 429) {
          logger.warn(
            `iTunes rate limited (${response.status}). Waiting before retry.`,
            'itunes'
          );
          await sleep(2000 * attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(
            `iTunes API error: ${response.status} ${response.statusText}`
          );
        }

        const data = (await response.json()) as ItunesSearchResponse;

        if (data.resultCount === 0 || data.results.length === 0) {
          logger.debug(`No iTunes results for "${term}"`, 'itunes');
          return null;
        }

        // Find best match: prefer exact artist match, then first result
        const bestMatch = findBestMatch(data.results, artist, title);
        return bestMatch;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.debug(
          `iTunes search failed (attempt ${attempt}/${this.retries}): ${lastError.message}`,
          'itunes'
        );

        if (attempt < this.retries) {
          await sleep(1000 * attempt);
        }
      }
    }

    // Don't throw on iTunes failures - it's an enrichment, not critical
    logger.debug(
      `iTunes search exhausted for "${term}": ${lastError?.message ?? 'unknown'}`,
      'itunes'
    );
    return null;
  }
}

// ── Match scoring ───────────────────────────────────────────────────

/**
 * Find the best matching iTunes result for a given artist/title pair.
 * Uses fuzzy matching to handle minor differences in naming.
 */
function findBestMatch(
  results: ItunesResult[],
  artist: string,
  title: string
): ItunesResult | null {
  const normalizeForCompare = (s: string): string =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const targetArtist = normalizeForCompare(artist);
  const targetTitle = normalizeForCompare(title);

  let bestResult: ItunesResult | null = null;
  let bestScore = -1;

  for (const result of results) {
    let score = 0;
    const resultArtist = normalizeForCompare(result.artistName);
    const resultTitle = normalizeForCompare(result.trackName);

    // Exact artist match
    if (resultArtist === targetArtist) {
      score += 10;
    } else if (resultArtist.includes(targetArtist) || targetArtist.includes(resultArtist)) {
      score += 5;
    }

    // Exact title match
    if (resultTitle === targetTitle) {
      score += 10;
    } else if (resultTitle.includes(targetTitle) || targetTitle.includes(resultTitle)) {
      score += 5;
    }

    // Bonus for having a preview URL
    if (result.previewUrl) {
      score += 2;
    }

    // Bonus for having artwork
    if (result.artworkUrl100) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestResult = result;
    }
  }

  // Require at least some matching relevance
  if (bestScore < 5) {
    logger.debug(
      `Best iTunes match score too low (${bestScore}) for "${artist} - ${title}"`,
      'itunes'
    );
    return null;
  }

  return bestResult;
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
