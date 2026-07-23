import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'staff'

export type Profile = {
  id: string
  nev: string | null
  role: Role
  aktiv: boolean
}

/** A bejelentkezett felhasználó minimális adatai a JWT claims-ből. */
export type AuthUser = {
  id: string
  email: string | undefined
}

/**
 * Az aktuális kérés autentikációja + profilja, requestenként CACHE-elve
 * (`React.cache`), így a layout és az oldal együtt is csak egyszer futtatja.
 *
 * A JWT-t `getClaims()` LOKÁLISAN ellenőrzi (ES256 aszimmetrikus kulcs,
 * WebCrypto) – nincs hálózati kör a Supabase Auth szerverhez, szemben a
 * korábbi `getUser()`-rel. Az app-szintű role a `profiles` táblából jön.
 */
const loadAuth = cache(
  async (): Promise<{ user: AuthUser | null; profile: Profile | null }> => {
    const supabase = await createClient()

    const {
      data: claimsData,
    } = await supabase.auth.getClaims()
    const claims = claimsData?.claims

    if (!claims?.sub) {
      return { user: null, profile: null }
    }

    const user: AuthUser = {
      id: claims.sub,
      email: typeof claims.email === 'string' ? claims.email : undefined,
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, nev, role, aktiv')
      .eq('id', user.id)
      .maybeSingle<Profile>()

    return { user, profile }
  }
)

/**
 * A bejelentkezett felhasználó + profilja. Ha nincs bejelentkezve,
 * átirányít a /login-ra.
 */
export async function requireUser() {
  const { user, profile } = await loadAuth()

  if (!user) {
    redirect('/login')
  }

  return { user, profile }
}

/**
 * Csak aktív staff/admin férhet hozzá. Inaktív vagy hiányzó profil esetén
 * kijelentkeztet.
 */
export async function requireStaff() {
  const { user, profile } = await requireUser()

  if (profile && (!profile.aktiv || (profile.role !== 'staff' && profile.role !== 'admin'))) {
    redirect('/login?error=no_access')
  }

  return { user, profile }
}

/** Csak admin role. */
export async function requireAdmin() {
  const { user, profile } = await requireUser()

  if (profile && profile.role !== 'admin') {
    redirect('/?error=admin_only')
  }

  return { user, profile }
}
