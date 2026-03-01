// ── Last.fm API client ───────────────────────────────────────────────
// Handles all communication with the Last.fm Web Services API (v2.0).

import { logger } from './logger.js';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

// ── Response types ──────────────────────────────────────────────────

export interface LastfmImage {
  '#text': string;
  size: string;
}

export interface LastfmTrack {
  name: string;
  duration: string;
  playcount: string;
  listeners: string;
  mbid?: string;
  url: string;
  artist: {
    name: string;
    mbid?: string;
    url: string;
  };
  image: LastfmImage[];
  '@attr'?: {
    rank: string;
  };
  toptags?: {
    tag: Array<{ name: string; url: string }>;
  };
}

export interface LastfmTopTracksResponse {
  tracks: {
    track: LastfmTrack[];
    '@attr': {
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
      country?: string;
      tag?: string;
    };
  };
}

export interface LastfmGeoTopTracksResponse {
  tracks: {
    track: LastfmTrack[];
    '@attr': {
      country: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

export interface LastfmTagTopTracksResponse {
  tracks: {
    track: LastfmTrack[];
    '@attr': {
      tag: string;
      page: string;
      perPage: string;
      totalPages: string;
      total: string;
    };
  };
}

// ── Client ──────────────────────────────────────────────────────────

export class LastfmClient {
  private readonly apiKey: string;
  private readonly retries: number;
  private readonly retryDelay: number;

  constructor(apiKey: string, options?: { retries?: number; retryDelay?: number }) {
    this.apiKey = apiKey;
    this.retries = options?.retries ?? 3;
    this.retryDelay = options?.retryDelay ?? 1000;
  }

  /**
   * Make a request to the Last.fm API with retry logic.
   */
  private async request<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(BASE_URL);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        logger.debug(
          `API request: ${params['method']} (attempt ${attempt}/${this.retries})`,
          'lastfm'
        );

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'ChartWave/1.0 (chart-fetcher)',
          },
        });

        if (!response.ok) {
          // Last.fm returns 429 for rate limiting
          if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
            logger.warn(
              `Rate limited. Waiting ${retryAfter}s before retry.`,
              'lastfm'
            );
            await sleep(retryAfter * 1000);
            continue;
          }

          throw new Error(
            `Last.fm API error: ${response.status} ${response.statusText}`
          );
        }

        const data = (await response.json()) as Record<string, unknown>;

        // Last.fm returns errors inside the JSON body
        if ('error' in data) {
          const errorMsg = (data['message'] as string) ?? 'Unknown Last.fm error';
          throw new Error(`Last.fm API error ${data['error']}: ${errorMsg}`);
        }

        return data as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          `Request failed (attempt ${attempt}/${this.retries}): ${lastError.message}`,
          'lastfm'
        );

        if (attempt < this.retries) {
          await sleep(this.retryDelay * attempt);
        }
      }
    }

    throw lastError ?? new Error('Last.fm request failed after all retries');
  }

  /**
   * Fetch global top tracks using chart.getTopTracks.
   */
  async getGlobalTopTracks(limit: number = 50): Promise<LastfmTrack[]> {
    logger.info(`Fetching global top ${limit} tracks`, 'lastfm');
    const response = await this.request<LastfmTopTracksResponse>({
      method: 'chart.getTopTracks',
      limit: String(limit),
    });
    return response.tracks.track;
  }

  /**
   * Fetch top tracks for a specific country using geo.getTopTracks.
   */
  async getCountryTopTracks(
    country: string,
    limit: number = 50
  ): Promise<LastfmTrack[]> {
    logger.info(`Fetching top ${limit} tracks for country: ${country}`, 'lastfm');
    const response = await this.request<LastfmGeoTopTracksResponse>({
      method: 'geo.getTopTracks',
      country,
      limit: String(limit),
    });
    return response.tracks.track;
  }

  /**
   * Fetch top tracks for a specific tag/genre using tag.getTopTracks.
   */
  async getTagTopTracks(tag: string, limit: number = 50): Promise<LastfmTrack[]> {
    logger.info(`Fetching top ${limit} tracks for tag: ${tag}`, 'lastfm');
    const response = await this.request<LastfmTagTopTracksResponse>({
      method: 'tag.getTopTracks',
      tag,
      limit: String(limit),
    });
    return response.tracks.track;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
