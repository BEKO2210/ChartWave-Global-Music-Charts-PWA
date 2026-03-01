import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  site: 'https://BEKO2210.github.io',
  base: '/chartwave',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'ChartWave',
          short_name: 'ChartWave',
          description: 'Global music charts with 30-second previews. Free. Open. Everywhere.',
          theme_color: '#6366f1',
          background_color: '#080810',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'any',
          start_url: '/chartwave/',
          scope: '/chartwave/',
          categories: ['music', 'entertainment'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ],
          screenshots: [
            { src: 'screenshot-desktop.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'ChartWave Desktop' },
            { src: 'screenshot-mobile.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow', label: 'ChartWave Mobile' }
          ],
          shortcuts: [
            { name: 'Global Top 50', url: '/chartwave/chart/global-top50', icons: [{ src: 'pwa-64x64.png', sizes: '64x64' }] },
            { name: 'Trending', url: '/chartwave/trending', icons: [{ src: 'pwa-64x64.png', sizes: '64x64' }] }
          ]
        },
        workbox: {
          navigateFallback: '/chartwave/offline',
          navigateFallbackDenylist: [/^\/chartwave\/api\//],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/is\d+\.mzstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'artwork-cache-v1',
                expiration: { maxEntries: 600, maxAgeSeconds: 2592000 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^https:\/\/audio-ssl\.itunes\.apple\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'preview-cache-v1',
                expiration: { maxEntries: 120, maxAgeSeconds: 604800 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true
              }
            },
            {
              urlPattern: /^https:\/\/coverartarchive\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'coverart-cache-v1',
                expiration: { maxEntries: 200, maxAgeSeconds: 2592000 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ]
  },
  experimental: {
    clientPrerender: true
  }
});
