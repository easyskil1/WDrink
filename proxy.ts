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
     * - favicon.ico, és a public mappa gyakori kiterjesztései
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
