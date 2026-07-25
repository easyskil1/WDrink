/*
 * Drink World - alap service worker (PWA telepíthetőség + gyorsabb/offline-tűrő
 * betöltés raktári wifin).
 *
 * ÓVATOS caching - hitelesített adat SOHA nem kerül cache-be:
 *  - Immutable statikus assetek (`/_next/static/`, ikonok): cache-first
 *    (a Next.js hasheli a fájlneveket, így nem avulnak el).
 *  - Szkenner WASM (`.wasm`): NEM előcache-elt (1 MB, csak a WASM-fallback
 *    útvonalon kell, natív BarcodeDetector esetén soha). Futásidőben, első
 *    tényleges használatkor cache-eljük cache-first módon → iOS-en az offline
 *    szken az első használat után megmarad, más eszköz nem tölti le feleslegesen.
 *  - Navigáció (HTML oldalbetöltés): network-first, hiba esetén offline oldal.
 *    A választ NEM cache-eljük (nehogy más user vagy elavult készlet ragadjon be).
 *  - Supabase (cross-origin), RSC-adatlekérés, POST/action: NEM nyúlunk hozzá,
 *    mindig élő hálózat.
 */

// v2: a szkenner WASM kikerült a precache-ből (lásd fetch-handler, .wasm ág).
// A verzióbump miatt a régi, 1 MB WASM-ot tartalmazó cache aktiváláskor törlődik.
const CACHE = 'dw-static-v2'

// Előcache-elt, verzió-független statikus fájlok (kicsi, minden eszköznek kell).
const PRECACHE = [
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Cache-first: statikus, hashelt/immutable assetekhez.
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const res = await fetch(request)
  if (res && res.ok && res.type === 'basic') {
    const cache = await caches.open(CACHE)
    cache.put(request, res.clone())
  }
  return res
}

// Network-first navigációhoz: élő hálózat, offline esetén offline oldal.
async function navigationFallback(request) {
  try {
    return await fetch(request)
  } catch {
    const offline = await caches.match('/offline.html')
    return offline || Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // Cross-origin (pl. Supabase) - ne nyúljunk hozzá.
  if (!sameOrigin) return

  // Immutable statikus assetek + szkenner WASM → cache-first.
  // A .wasm nincs előcache-elve: első tényleges használatkor kerül cache-be.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.wasm') ||
    PRECACHE.includes(url.pathname)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Teljes oldalbetöltés (navigáció) → network-first, offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request))
    return
  }

  // Minden más (RSC-adat, egyéb GET) → érintetlen, élő hálózat.
})
