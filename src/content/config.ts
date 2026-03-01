import { z, defineCollection } from 'astro:content';

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
  errors: z.array(
    z.object({
      chart: z.string(),
      error: z.string(),
    })
  ),
});

export const collections = {
  charts: defineCollection({
    type: 'data',
    schema: chartSchema,
  }),
};

export type Track = z.infer<typeof trackSchema>;
export type Chart = z.infer<typeof chartSchema>;
export type ArtworkUrls = z.infer<typeof artworkSchema>;
export type TrackLinks = z.infer<typeof linksSchema>;
export type ChartMeta = z.infer<typeof metaSchema>;
export type RankChange = Track['rankChange'];
export type ChartType = Chart['type'];

export {
  trackSchema,
  chartSchema,
  metaSchema,
  artworkSchema,
  linksSchema,
};
