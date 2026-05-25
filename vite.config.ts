import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// To deploy on GitHub Pages under a subpath, set VITE_BASE="/repo-name/" before build.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  server: { host: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'calendar/*.ics'],
      manifest: {
        name: 'Trip Atlas',
        short_name: 'Atlas',
        description: 'Interactive trip itineraries with offline support.',
        theme_color: '#f5ede0',
        background_color: '#f5ede0',
        display: 'standalone',
        scope: process.env.VITE_BASE ?? '/',
        start_url: process.env.VITE_BASE ?? '/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,ics,json}'],
        // Make sure the SPA fallback works for deep links offline
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/calendar\//, /\/api\//],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            // CartoDB Voyager tiles
            urlPattern: ({ url }) => url.host.endsWith('basemaps.cartocdn.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-tiles',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts CSS
            urlPattern: ({ url }) => url.host === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'atlas-fonts-css' },
          },
          {
            // Google Fonts files
            urlPattern: ({ url }) => url.host === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Wikimedia photos (used for activity hero images)
            urlPattern: ({ url }) =>
              url.host === 'upload.wikimedia.org' || url.host === 'commons.wikimedia.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'atlas-photos',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
