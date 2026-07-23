import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'staff'

export type Profile = {
  id: string
  nev: string | null
  role: Role
  aktiv: boolean
}

/**
 * A bejelentkezett felhasználó + profilja. Ha nincs bejelentkezve,
 * átirányít a /login-ra.
 *
 * A `profiles` tábla a 2. fázisban jön létre; amíg nincs, a profil null,
 * és a hívó a user létére támaszkodhat.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nev, role, aktiv')
    .eq('id', user.id)
    .maybeSingle<Profile>()

  return { user, profile }
}

/**
 * Csak aktív staff/admin férhet hozzá. Inaktív vagy hiányzó profil esetén
 * kijelentkeztet. (A profiles tábla létrejötte után éles.)
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
