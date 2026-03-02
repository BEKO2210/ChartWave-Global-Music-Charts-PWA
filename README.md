# ChartWave — Global Music Charts PWA

> Discover music. Free. Open. Everywhere.

ChartWave is a free, open-source Progressive Web App that brings you **global and country-specific music charts** with **30-second song previews**. No account required. No ads. No tracking.

**Live**: [https://BEKO2210.github.io/chartwave]([https://BEKO2210.github.io/chartwave](https://beko2210.github.io/ChartWave-Global-Music-Charts-PWA/))

---

## Features

- **Global & Country Charts** — Top 50 tracks for 10+ countries, updated daily
- **Genre Charts** — Pop, Hip-Hop, Rock, Electronic, and 10+ more genres
- **30-Second Previews** — Play song previews directly in the browser
- **Full Audio Player** — Queue, shuffle, repeat, volume control, media keys
- **PWA** — Install as a native app, works offline
- **Dark & Light Themes** — System-aware with manual toggle
- **Zero Tracking** — No analytics, no cookies, no data collection
- **Keyboard Shortcuts** — Space to play/pause, arrows to seek/volume, and more

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript 5 (strict) |
| Audio | Howler.js |
| State | Nanostores |
| Validation | Zod |
| PWA | @vite-pwa/astro + Workbox 7 |
| Hosting | GitHub Pages (free) |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Clone the repository
git clone https://github.com/BEKO2210/chartwave.git
cd chartwave

# Install dependencies
npm install

# Start development server
npm run dev
```

The app works out of the box with mock data — no API key needed for development.

### Fetch Real Data

To fetch live chart data, you need a free [Last.fm API key](https://www.last.fm/api/account/create):

```bash
LASTFM_API_KEY=your_key_here npm run fetch:charts
```

### Build

```bash
npm run build      # Production build
npm run preview    # Preview the build
```

### Validate Data

```bash
npm run validate:charts   # Validate all chart JSON files
```

## Data Sources

All data comes from free, publicly accessible APIs:

- **[Last.fm](https://www.last.fm/api)** — Chart rankings, play counts, listener data
- **[iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/)** — 30-second previews, HD artwork
- **[MusicBrainz](https://musicbrainz.org/)** — ISRC codes, additional metadata

## How It Works

1. **GitHub Actions** runs daily at 06:00 UTC
2. Fetches fresh data from Last.fm, iTunes, and MusicBrainz
3. Writes typed JSON files to the repository
4. Astro builds a fully static site from the data
5. Deploys to GitHub Pages — zero cost, zero backend

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause |
| `Arrow Up/Down` | Volume |
| `M` | Mute / Unmute |
| `S` | Toggle Shuffle |
| `L` | Toggle Repeat |
| `F` | Full-screen Player |
| `Q` | Toggle Queue |
| `Ctrl+K` | Search |

## Project Structure

```
src/
├── content/        # Chart data (JSON) + Zod schemas
├── components/     # Astro components (layout, player, tracks, charts, ui)
├── pages/          # Route pages
├── stores/         # Nanostores (player, favorites, playlists)
├── lib/            # Audio player, theme manager, keyboard shortcuts
├── utils/          # Formatting, slugify, chart helpers
└── styles/         # Global CSS with Tailwind v4

scripts/            # Data fetching & validation (Node.js, runs in CI)
.github/workflows/  # GitHub Actions (daily fetch + deploy, PR checks)
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Privacy

ChartWave has **zero tracking**:
- No analytics or tracking scripts
- No cookies
- Preferences stored only in localStorage (never transmitted)

See [Privacy Policy](https://BEKO2210.github.io/chartwave/privacy) for details.

## License

This project is open source under the [MIT License](LICENSE).

Music content, artwork, and audio previews are the property of their respective copyright holders.

---

Built with Astro, Tailwind CSS, and open APIs.
