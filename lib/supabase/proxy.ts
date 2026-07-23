import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * A Supabase session frissítése minden kérésnél + útvonal-védelem.
 *
 * A proxy.ts hívja. Ha a felhasználó nincs bejelentkezve és védett útvonalat
 * kér, átirányítjuk a /login-ra. A tényleges role-ellenőrzés a szerver oldali
 * layoutokban/action-ökben történik (a proxy-ra önmagában nem támaszkodunk).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // FONTOS: getClaims/getUser hívás nélkül a session nem frissül. Ne tegyünk
  // közé más logikát, különben nehezen debugolható kijelentkezéseket okozhat.
  //
  // getClaims() a JWT-t LOKÁLISAN ellenőrzi (ES256 aszimmetrikus kulcs,
  // WebCrypto) – nincs hálózati kör a Supabase Auth szerverhez minden
  // requestnél, mint a getUser()-nél. A lejárt token frissítése (getSession)
  // továbbra is megtörténik, amikor ténylegesen szükséges.
  const {
    data: claimsData,
  } = await supabase.auth.getClaims()
  const user = claimsData?.claims?.sub ? claimsData.claims : null

  const { pathname } = request.nextUrl
  const isPublic =
    pathname === '/login' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // Bejelentkezett felhasználót a /login-ról az admin főoldalra irányítunk.
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}
