import { defineConfig } from 'vite'
import { svelte }       from '@sveltejs/vite-plugin-svelte'
import { VitePWA }      from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },  // désactivé en dev — évite que le SW intercepte les appels /api

      // ── Manifest ──────────────────────────────────────────────────────────
      manifest: {
        name:             'Confiance+',
        short_name:       'Confiance+',
        description:      'Tracker d\'habitudes quotidiennes',
        theme_color:      '#07071a',
        background_color: '#07071a',
        display:          'standalone',
        orientation:      'portrait',
        start_url:        '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },

      // ── Workbox (Service Worker) ───────────────────────────────────────────
      workbox: {
        // Cache uniquement les assets statiques
        globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,ico}'],

        // Les appels /api/* ne sont JAMAIS mis en cache
        navigateFallbackDenylist: [/^\/api/],

        runtimeCaching: [
          // /api/* — jamais de cache, toujours le réseau
          {
            urlPattern: /^\/api\//,
            handler:    'NetworkOnly',
          },
          // Google Fonts — cache long (assets immuables)
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler:    'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],

        // Exclure explicitement toute l'API du cache runtime
        navigateFallback: '/index.html',
      },
    }),
  ],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
