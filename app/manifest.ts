import type { MetadataRoute } from 'next'

// Web App Manifest – telepíthető PWA (kezdőképernyőre adható, standalone).
// Standalone módban iOS Safari megjegyzi a kamera-engedélyt → nincs
// oldalbetöltésenkénti újrakérdezés a szkennernél.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Drink World Győr – Admin',
    short_name: 'Drink World',
    description: 'Ital-nagykereskedés logisztikai admin rendszer',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0d10',
    theme_color: '#0b0d10',
    lang: 'hu',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
