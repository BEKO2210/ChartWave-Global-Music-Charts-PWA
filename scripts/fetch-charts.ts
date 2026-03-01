#!/usr/bin/env node
// ── fetch-charts.ts ──────────────────────────────────────────────────
// Main chart-fetching script for ChartWave.
// Runs via `tsx scripts/fetch-charts.ts` in GitHub Actions (daily 06:00 UTC).
//
// Fetches chart data from Last.fm, enriches with iTunes Search API,
// and writes typed JSON to src/content/charts/.
//
// NO Astro imports. All types are defined inline.
// ─────────────────────────────────────────────────────────────────────

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { logger } from './lib/logger.js';
import { LastfmClient, type LastfmTrack } from './lib/lastfm.js';
import { ItunesClient, type ItunesResult } from './lib/itunes.js';
import { slugify, trackId } from './lib/slugify.js';
import {
  normalizeArtistName,
  normalizeTrackTitle,
  buildArtworkFromItunes,
  buildArtworkFromLastfm,
  safeParseInt,
  msToSeconds,
  computeRankChange,
} from './lib/normalizer.js';

// ── Inline types (no Astro imports) ─────────────────────────────────

type RankChange = 'up' | 'down' | 'same' | 'new';
type ChartType = 'global' | 'country' | 'genre' | 'trending' | 'newreleases' | 'decade';
type DataSource = 'lastfm' | 'itunes' | 'musicbrainz';

interface ArtworkUrls {
  small: string;
  medium: string;
  large: string;
  placeholder: string;
}

interface TrackLinks {
  lastfm?: string;
  itunes?: string;
  musicbrainz?: string;
  soundcloud?: string;
  spotify?: string;
}

interface Track {
  id: string;
  mbid?: string;
  isrc?: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistMbid?: string;
  albumTitle?: string;
  duration?: number;
  releaseDate?: string;
  rank: number;
  previousRank?: number;
  rankChange: RankChange;
  rankDelta?: number;
  playcount: number;
  listeners: number;
  previewUrl: string | null;
  artwork: ArtworkUrls;
  links: TrackLinks;
  tags: string[];
  genres: string[];
  explicit?: boolean;
  language?: string;
  dataSources: DataSource[];
}

interface Chart {
  id: string;
  slug: string;
  name: string;
  type: ChartType;
  description: string;
  country?: string;
  countryName?: string;
  genre?: string;
  genreColor?: string;
  tracks: Track[];
  lastUpdated: string;
  totalTracks: number;
  coverColor: string;
}

interface ChartMeta {
  lastUpdated: string;
  totalTracks: number;
  totalCharts: number;
  totalWithPreview: number;
  previewCoverage: number;
  fetchDuration: number;
  errors: Array<{ chart: string; error: string }>;
}

// ── Chart configurations ────────────────────────────────────────────

interface ChartConfig {
  id: string;
  name: string;
  type: ChartType;
  description: string;
  method: 'global' | 'country' | 'tag';
  param?: string;
  country?: string;
  countryName?: string;
  genre?: string;
  genreColor?: string;
  coverColor: string;
  limit: number;
}

const COUNTRY_CONFIGS: ChartConfig[] = [
  {
    id: 'de-top50',
    name: 'Germany Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Germany, updated daily.',
    method: 'country',
    param: 'germany',
    country: 'de',
    countryName: 'Germany',
    coverColor: '#ef4444',
    limit: 50,
  },
  {
    id: 'at-top50',
    name: 'Austria Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Austria, updated daily.',
    method: 'country',
    param: 'austria',
    country: 'at',
    countryName: 'Austria',
    coverColor: '#ef4444',
    limit: 50,
  },
  {
    id: 'ch-top50',
    name: 'Switzerland Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Switzerland, updated daily.',
    method: 'country',
    param: 'switzerland',
    country: 'ch',
    countryName: 'Switzerland',
    coverColor: '#ef4444',
    limit: 50,
  },
  {
    id: 'us-top50',
    name: 'United States Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in the United States, updated daily.',
    method: 'country',
    param: 'united states',
    country: 'us',
    countryName: 'United States',
    coverColor: '#3b82f6',
    limit: 50,
  },
  {
    id: 'uk-top50',
    name: 'United Kingdom Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in the United Kingdom, updated daily.',
    method: 'country',
    param: 'united kingdom',
    country: 'gb',
    countryName: 'United Kingdom',
    coverColor: '#3b82f6',
    limit: 50,
  },
  {
    id: 'fr-top50',
    name: 'France Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in France, updated daily.',
    method: 'country',
    param: 'france',
    country: 'fr',
    countryName: 'France',
    coverColor: '#3b82f6',
    limit: 50,
  },
  {
    id: 'jp-top50',
    name: 'Japan Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Japan, updated daily.',
    method: 'country',
    param: 'japan',
    country: 'jp',
    countryName: 'Japan',
    coverColor: '#ec4899',
    limit: 50,
  },
  {
    id: 'kr-top50',
    name: 'South Korea Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in South Korea, updated daily.',
    method: 'country',
    param: 'south korea',
    country: 'kr',
    countryName: 'South Korea',
    coverColor: '#ec4899',
    limit: 50,
  },
  {
    id: 'br-top50',
    name: 'Brazil Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Brazil, updated daily.',
    method: 'country',
    param: 'brazil',
    country: 'br',
    countryName: 'Brazil',
    coverColor: '#22c55e',
    limit: 50,
  },
  {
    id: 'au-top50',
    name: 'Australia Top 50',
    type: 'country',
    description: 'Top 50 most listened tracks in Australia, updated daily.',
    method: 'country',
    param: 'australia',
    country: 'au',
    countryName: 'Australia',
    coverColor: '#f59e0b',
    limit: 50,
  },
];

const GENRE_COLOR_MAP: Record<string, string> = {
  pop: '--genre-pop',
  'hip-hop': '--genre-hip-hop',
  rock: '--genre-rock',
  electronic: '--genre-electronic',
  'r&b': '--genre-rnb',
  indie: '--genre-indie',
  metal: '--genre-metal',
  jazz: '--genre-jazz',
  classical: '--genre-classical',
  latin: '--genre-latin',
  country: '--genre-country',
  'k-pop': '--genre-kpop',
  deutschrap: '--genre-deutschrap',
};

const GENRE_COVER_COLOR_MAP: Record<string, string> = {
  pop: '#ec4899',
  'hip-hop': '#f97316',
  rock: '#ef4444',
  electronic: '#06b6d4',
  'r&b': '#8b5cf6',
  indie: '#10b981',
  metal: '#6b7280',
  jazz: '#f59e0b',
  classical: '#a78bfa',
  latin: '#f43f5e',
  country: '#d97706',
  'k-pop': '#e879f9',
  deutschrap: '#64748b',
};

const GENRE_DISPLAY_NAMES: Record<string, string> = {
  pop: 'Pop',
  'hip-hop': 'Hip-Hop',
  rock: 'Rock',
  electronic: 'Electronic',
  'r&b': 'R&B',
  indie: 'Indie',
  metal: 'Metal',
  jazz: 'Jazz',
  classical: 'Classical',
  latin: 'Latin',
  country: 'Country',
  'k-pop': 'K-Pop',
  deutschrap: 'Deutschrap',
};

const GENRE_CONFIGS: ChartConfig[] = [
  'pop',
  'hip-hop',
  'rock',
  'electronic',
  'r&b',
  'indie',
  'metal',
  'jazz',
  'classical',
  'latin',
  'country',
  'k-pop',
  'deutschrap',
].map((genre) => ({
  id: `genre-${slugify(genre)}`,
  name: GENRE_DISPLAY_NAMES[genre] ?? genre,
  type: 'genre' as ChartType,
  description: `Top ${GENRE_DISPLAY_NAMES[genre] ?? genre} tracks worldwide, updated daily from Last.fm.`,
  method: 'tag' as const,
  param: genre,
  genre,
  genreColor: GENRE_COLOR_MAP[genre] ?? '--genre-default',
  coverColor: GENRE_COVER_COLOR_MAP[genre] ?? '#6366f1',
  limit: 50,
}));

const GLOBAL_CONFIG: ChartConfig = {
  id: 'global-top50',
  name: 'Global Top 50',
  type: 'global',
  description: 'The most listened tracks worldwide right now, updated daily from Last.fm.',
  method: 'global',
  coverColor: '#6366f1',
  limit: 50,
};

const ALL_CHARTS: ChartConfig[] = [GLOBAL_CONFIG, ...COUNTRY_CONFIGS, ...GENRE_CONFIGS];

// ── Output paths ────────────────────────────────────────────────────

const SCRIPT_DIR = import.meta.dirname!;
const PROJECT_ROOT = join(SCRIPT_DIR, '..');
const CHARTS_DIR = join(PROJECT_ROOT, 'src', 'content', 'charts');

// ── Previous rank tracking ──────────────────────────────────────────

/**
 * Load previous chart data to compute rank changes.
 * Returns a map of track ID -> previous rank.
 */
async function loadPreviousRanks(chartId: string): Promise<Map<string, number>> {
  const filePath = join(CHARTS_DIR, `${chartId}.json`);
  const rankMap = new Map<string, number>();

  try {
    if (!existsSync(filePath)) {
      return rankMap;
    }

    const raw = await readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Chart;

    for (const track of data.tracks) {
      rankMap.set(track.id, track.rank);
    }
  } catch {
    logger.debug(`No previous data for chart ${chartId}`, 'ranks');
  }

  return rankMap;
}

// ── Track building ──────────────────────────────────────────────────

/**
 * Build a Track object from Last.fm data, enriched with iTunes data.
 */
function buildTrack(
  lastfmTrack: LastfmTrack,
  itunesResult: ItunesResult | null,
  rank: number,
  previousRank: number | undefined
): Track {
  const artist = normalizeArtistName(lastfmTrack.artist.name);
  const title = normalizeTrackTitle(lastfmTrack.name);
  const id = trackId(artist, title);
  const artistSlug = slugify(artist);

  // Rank change computation
  const { rankChange, rankDelta } = computeRankChange(rank, previousRank);

  // Data sources
  const dataSources: DataSource[] = ['lastfm'];
  if (itunesResult) {
    dataSources.push('itunes');
  }

  // Artwork: prefer iTunes, fall back to Last.fm
  const artwork = itunesResult?.artworkUrl100
    ? buildArtworkFromItunes(itunesResult.artworkUrl100)
    : buildArtworkFromLastfm(lastfmTrack.image);

  // Preview URL from iTunes
  const previewUrl = itunesResult?.previewUrl ?? null;

  // Album from iTunes
  const albumTitle = itunesResult?.collectionName ?? undefined;

  // Duration: prefer iTunes (more accurate), fall back to Last.fm
  const itunesDuration = msToSeconds(itunesResult?.trackTimeMillis);
  const lastfmDuration = safeParseInt(lastfmTrack.duration);
  const duration = itunesDuration ?? (lastfmDuration > 0 ? lastfmDuration : undefined);

  // Tags from Last.fm
  const tags: string[] = lastfmTrack.toptags?.tag?.map((t) => t.name.toLowerCase()) ?? [];

  // Extract genres from tags (simplified heuristic)
  const genreKeywords = [
    'pop', 'rock', 'hip-hop', 'hip hop', 'rap', 'electronic', 'dance',
    'r&b', 'rnb', 'indie', 'metal', 'jazz', 'classical', 'latin',
    'country', 'k-pop', 'kpop', 'folk', 'soul', 'blues', 'punk',
    'alternative', 'reggae', 'afrobeats', 'deutschrap',
  ];
  const genres = tags.filter((t) => genreKeywords.includes(t));

  // Links
  const links: TrackLinks = {};
  if (lastfmTrack.url) {
    links.lastfm = lastfmTrack.url;
  }
  if (itunesResult?.trackViewUrl) {
    links.itunes = itunesResult.trackViewUrl;
  }

  // Explicit flag from iTunes
  const explicit =
    itunesResult?.trackExplicitness === 'explicit' ? true : undefined;

  // Build the track
  const track: Track = {
    id,
    title,
    artistName: artist,
    artistSlug,
    rank,
    rankChange,
    playcount: safeParseInt(lastfmTrack.playcount),
    listeners: safeParseInt(lastfmTrack.listeners),
    previewUrl,
    artwork,
    links,
    tags,
    genres,
    dataSources,
  };

  // Add optional fields only when present
  if (lastfmTrack.mbid) track.mbid = lastfmTrack.mbid;
  if (lastfmTrack.artist.mbid) track.artistMbid = lastfmTrack.artist.mbid;
  if (albumTitle) track.albumTitle = albumTitle;
  if (duration !== undefined) track.duration = duration;
  if (previousRank !== undefined) track.previousRank = previousRank;
  if (rankDelta !== undefined) track.rankDelta = rankDelta;
  if (explicit !== undefined) track.explicit = explicit;
  if (itunesResult?.releaseDate) track.releaseDate = itunesResult.releaseDate;

  return track;
}

// ── Chart processing ────────────────────────────────────────────────

/**
 * Fetch and process a single chart configuration.
 */
async function processChart(
  config: ChartConfig,
  lastfm: LastfmClient,
  itunes: ItunesClient
): Promise<Chart> {
  logger.section(`${config.name} (${config.id})`);

  // 1. Fetch tracks from Last.fm
  let lastfmTracks: LastfmTrack[];

  switch (config.method) {
    case 'global':
      lastfmTracks = await lastfm.getGlobalTopTracks(config.limit);
      break;
    case 'country':
      lastfmTracks = await lastfm.getCountryTopTracks(config.param!, config.limit);
      break;
    case 'tag':
      lastfmTracks = await lastfm.getTagTopTracks(config.param!, config.limit);
      break;
    default:
      throw new Error(`Unknown chart method: ${config.method}`);
  }

  logger.info(
    `Received ${lastfmTracks.length} tracks from Last.fm`,
    config.id
  );

  // 2. Load previous ranks for change computation
  const previousRanks = await loadPreviousRanks(config.id);

  // 3. Enrich each track with iTunes data
  const tracks: Track[] = [];

  for (let i = 0; i < lastfmTracks.length; i++) {
    const lfTrack = lastfmTracks[i]!;
    const rank = i + 1;

    const artist = normalizeArtistName(lfTrack.artist.name);
    const title = normalizeTrackTitle(lfTrack.name);
    const id = trackId(artist, title);

    logger.progress(rank, lastfmTracks.length, `${artist} - ${title}`, config.id);

    // iTunes enrichment (non-critical, errors are swallowed)
    let itunesResult: ItunesResult | null = null;
    try {
      itunesResult = await itunes.searchTrack(artist, title);
    } catch (err) {
      logger.debug(
        `iTunes enrichment failed for "${artist} - ${title}": ${err instanceof Error ? err.message : String(err)}`,
        config.id
      );
    }

    const previousRank = previousRanks.get(id);
    const track = buildTrack(lfTrack, itunesResult, rank, previousRank);
    tracks.push(track);
  }

  // 4. Build chart object
  const chart: Chart = {
    id: config.id,
    slug: config.id,
    name: config.name,
    type: config.type,
    description: config.description,
    tracks,
    lastUpdated: new Date().toISOString(),
    totalTracks: tracks.length,
    coverColor: config.coverColor,
  };

  // Add optional chart-level fields
  if (config.country) chart.country = config.country;
  if (config.countryName) chart.countryName = config.countryName;
  if (config.genre) chart.genre = config.genre;
  if (config.genreColor) chart.genreColor = config.genreColor;

  const previewCount = tracks.filter((t) => t.previewUrl !== null).length;
  logger.info(
    `Processed ${tracks.length} tracks (${previewCount} with preview)`,
    config.id
  );

  return chart;
}

// ── File writing ────────────────────────────────────────────────────

/**
 * Write a chart JSON file to the output directory.
 */
async function writeChart(chart: Chart): Promise<void> {
  const filePath = join(CHARTS_DIR, `${chart.id}.json`);
  const json = JSON.stringify(chart, null, 2);
  await writeFile(filePath, json + '\n', 'utf-8');
  logger.info(`Written ${filePath}`, 'writer');
}

/**
 * Write meta.json with aggregated stats.
 */
async function writeMeta(meta: ChartMeta): Promise<void> {
  const filePath = join(CHARTS_DIR, 'meta.json');
  const json = JSON.stringify(meta, null, 2);
  await writeFile(filePath, json + '\n', 'utf-8');
  logger.info(`Written ${filePath}`, 'writer');
}

// ── Main entry point ────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = performance.now();

  // 1. Validate environment
  const apiKey = process.env['LASTFM_API_KEY'];
  if (!apiKey) {
    logger.error('LASTFM_API_KEY environment variable is required');
    process.exit(1);
  }

  logger.section('ChartWave - Chart Data Fetcher');
  logger.info(`Starting fetch for ${ALL_CHARTS.length} charts`);
  logger.info(`Output directory: ${CHARTS_DIR}`);

  // 2. Ensure output directory exists
  await mkdir(CHARTS_DIR, { recursive: true });

  // 3. Initialize API clients
  const lastfm = new LastfmClient(apiKey, { retries: 3, retryDelay: 1000 });
  const itunes = new ItunesClient({ retries: 2, country: 'us' });

  // 4. Process all charts
  const charts: Chart[] = [];
  const errors: Array<{ chart: string; error: string }> = [];

  for (const config of ALL_CHARTS) {
    try {
      const chart = await processChart(config, lastfm, itunes);
      charts.push(chart);
      await writeChart(chart);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to process chart "${config.id}": ${message}`, 'main');
      errors.push({ chart: config.id, error: message });
    }
  }

  // 5. Compute meta stats
  const totalTracks = charts.reduce((sum, c) => sum + c.totalTracks, 0);
  const totalWithPreview = charts.reduce(
    (sum, c) => sum + c.tracks.filter((t) => t.previewUrl !== null).length,
    0
  );
  const previewCoverage =
    totalTracks > 0 ? Math.round((totalWithPreview / totalTracks) * 10000) / 100 : 0;
  const fetchDuration = Math.round((performance.now() - startTime) / 100) / 10;

  const meta: ChartMeta = {
    lastUpdated: new Date().toISOString(),
    totalTracks,
    totalCharts: charts.length,
    totalWithPreview,
    previewCoverage,
    fetchDuration,
    errors,
  };

  await writeMeta(meta);

  // 6. Summary
  logger.section('Fetch Summary');
  logger.info(`Charts processed: ${charts.length}/${ALL_CHARTS.length}`);
  logger.info(`Total tracks: ${totalTracks}`);
  logger.info(`Tracks with preview: ${totalWithPreview} (${previewCoverage}%)`);
  logger.info(`Duration: ${fetchDuration}s`);

  if (errors.length > 0) {
    logger.warn(`Errors: ${errors.length}`);
    for (const err of errors) {
      logger.error(`  - ${err.chart}: ${err.error}`);
    }
  }

  // 7. Exit with error code if any chart failed
  if (errors.length > 0) {
    logger.error(
      `Exiting with code 1 due to ${errors.length} chart failure(s).`
    );
    process.exit(1);
  }

  logger.info('All charts fetched successfully!');
}

// ── Run ─────────────────────────────────────────────────────────────

main().catch((err: unknown) => {
  logger.error(
    `Unhandled error: ${err instanceof Error ? err.message : String(err)}`
  );
  if (err instanceof Error && err.stack) {
    logger.error(err.stack);
  }
  process.exit(1);
});
