import { createClient } from '@supabase/supabase-js'

/**
 * Service role kulcsot használó admin kliens.
 *
 * FIGYELEM: kizárólag szerver oldalon (API route / Server Action) használható,
 * a kulcs SOHA nem kerülhet a kliensre. Megkerüli az RLS-t, ezért csak
 * ellenőrzött, admin jogosultsághoz kötött műveletekben hívd.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
