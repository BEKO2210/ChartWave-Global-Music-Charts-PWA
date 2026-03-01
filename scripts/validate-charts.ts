import { z } from 'zod';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// ── Schemas ──────────────────────────────────────────────────────────

const artworkSchema = z.object({
  small: z.string().url(),
  medium: z.string().url(),
  large: z.string().url(),
  xl: z.string().url().optional(),
  placeholder: z.string(),
});

const linksSchema = z.object({
  lastfm: z.string().url().optional(),
  itunes: z.string().url().optional(),
  musicbrainz: z.string().url().optional(),
  soundcloud: z.string().url().optional(),
  spotify: z.string().url().optional(),
});

const trackSchema = z.object({
  id: z.string(),
  mbid: z.string().optional(),
  isrc: z.string().optional(),
  title: z.string(),
  artistName: z.string(),
  artistSlug: z.string(),
  artistMbid: z.string().optional(),
  albumTitle: z.string().optional(),
  duration: z.number().optional(),
  releaseDate: z.string().optional(),
  rank: z.number().int().positive(),
  previousRank: z.number().int().positive().optional(),
  rankChange: z.enum(['up', 'down', 'same', 'new']),
  rankDelta: z.number().int().optional(),
  playcount: z.number().int(),
  listeners: z.number().int(),
  previewUrl: z.string().url().nullable(),
  artwork: artworkSchema,
  links: linksSchema,
  tags: z.array(z.string()),
  genres: z.array(z.string()),
  explicit: z.boolean().optional(),
  language: z.string().length(2).optional(),
  dataSources: z.array(z.enum(['lastfm', 'itunes', 'musicbrainz'])),
});

const chartSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  type: z.enum(['global', 'country', 'genre', 'trending', 'newreleases', 'decade']),
  description: z.string(),
  country: z.string().length(2).optional(),
  countryName: z.string().optional(),
  genre: z.string().optional(),
  genreColor: z.string().optional(),
  tracks: z.array(trackSchema),
  lastUpdated: z.string().datetime(),
  totalTracks: z.number().int(),
  coverColor: z.string(),
});

const metaSchema = z.object({
  lastUpdated: z.string().datetime(),
  totalTracks: z.number().int(),
  totalCharts: z.number().int(),
  totalWithPreview: z.number().int(),
  previewCoverage: z.number(),
  fetchDuration: z.number(),
  errors: z.array(z.object({ chart: z.string(), error: z.string() })),
});

// ── Validation ───────────────────────────────────────────────────────

const CHARTS_DIR = join(import.meta.dirname!, '..', 'src', 'content', 'charts');
const META_PATH = join(import.meta.dirname!, '..', 'src', 'content', 'meta.json');

async function validateFile(filePath: string, fileName: string, schema: z.ZodType): Promise<boolean> {
  const raw = await readFile(filePath, 'utf-8');
  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    console.error(`[FAIL] ${fileName} — invalid JSON`);
    return false;
  }

  const result = schema.safeParse(data);

  if (result.success) {
    console.log(`[PASS] ${fileName}`);
    return true;
  } else {
    console.error(`[FAIL] ${fileName}`);
    for (const issue of result.error.issues) {
      console.error(`       → ${issue.path.join('.')} — ${issue.message}`);
    }
    return false;
  }
}

async function main() {
  const files = (await readdir(CHARTS_DIR)).filter((f) => f.endsWith('.json'));
  let passed = 0;
  let failed = 0;
  let total = 0;

  // Validate chart files
  for (const file of files) {
    total++;
    const ok = await validateFile(join(CHARTS_DIR, file), file, chartSchema);
    if (ok) passed++;
    else failed++;
  }

  // Validate meta.json separately
  try {
    await readFile(META_PATH, 'utf-8');
    total++;
    const ok = await validateFile(META_PATH, 'meta.json', metaSchema);
    if (ok) passed++;
    else failed++;
  } catch {
    // meta.json is optional during development
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${total} files`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
