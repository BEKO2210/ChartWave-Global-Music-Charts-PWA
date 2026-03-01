# ChartWave — Development Guide for Claude Code

## Project Overview
ChartWave is a Progressive Web App for global music charts with 30-second previews.
Built with Astro 5 + Tailwind CSS v4 + TypeScript strict mode. Fully static, hosted on GitHub Pages.

## Quick Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run validate:charts` — Validate chart JSON data
- `npm run fetch:charts` — Fetch fresh chart data (requires LASTFM_API_KEY)

## Architecture
- **Framework**: Astro 5 (static output, Content Collections v2, View Transitions)
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/styles/global.css`)
- **Audio**: Howler.js singleton in `src/lib/audioPlayer.ts`
- **State**: Nanostores in `src/stores/`
- **Data**: JSON files in `src/content/charts/`, validated by Zod schemas

## Key Files
- `src/content/config.ts` — Zod schemas + TypeScript types for all data
- `src/lib/audioPlayer.ts` — Howler.js audio manager (singleton)
- `src/stores/player.ts` — Player state atoms (nanostores)
- `src/styles/global.css` — Design tokens, animations, utility classes
- `scripts/fetch-charts.ts` — Data fetcher (runs in GitHub Actions)
- `scripts/validate-charts.ts` — Schema validator

## Content Collections
Charts are Astro Content Collections (type: 'data'). Each `.json` in `src/content/charts/`
must conform to the `chartSchema` defined in `src/content/config.ts`.
Meta stats are in `src/content/meta.json` (separate from the collection).

## Data Flow
1. GitHub Actions runs `fetch-charts.ts` daily at 06:00 UTC
2. Script fetches from Last.fm + iTunes + MusicBrainz APIs
3. Writes typed JSON to `src/content/charts/*.json`
4. Astro builds static HTML from the JSON data
5. Deploys to GitHub Pages

## Code Conventions
- TypeScript strict mode — no `any`, no `!` assertions
- Import types from `src/content/config.ts`
- Use path aliases: `@components/`, `@stores/`, `@lib/`, `@utils/`, `@styles/`
- CSS custom properties for theming (e.g., `var(--bg-surface)`)
- All external links: `rel="noopener noreferrer" target="_blank"`

## API Keys
- `LASTFM_API_KEY` — Required for data fetching (stored as GitHub Secret)
- iTunes Search API — No auth needed
- MusicBrainz — No auth needed (use User-Agent header)

## Testing
- Run `npm run build` to verify everything compiles
- Run `npm run validate:charts` to validate data schemas
- The build process itself validates Content Collections schemas
