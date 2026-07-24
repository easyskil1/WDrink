import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Next.js 16: a `middleware.ts` helyett `proxy.ts` a konvenció.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Minden útvonalra fut, kivéve:
     * - _next/static (statikus fájlok)
     * - _next/image (képoptimalizálás)
     * - favicon.ico
     * - PWA-endpointok: sw.js, offline.html, manifest.webmanifest (auth nélkül
     *   elérhetőnek kell lenniük, különben a telepítés/SW-regisztráció elbukik)
     * - a public mappa gyakori kiterjesztései (kép + wasm)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|offline.html|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm)$).*)',
  ],
}
