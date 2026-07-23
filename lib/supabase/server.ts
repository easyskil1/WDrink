import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Szerver oldali (Server Component / Route Handler / Server Action) Supabase kliens.
 * A bejelentkezett felhasználó session-jét a request cookie-kból olvassa.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component-ből hívva a cookie-írás nem engedélyezett – ezt a
            // proxy.ts frissíti a session-t, így itt figyelmen kívül hagyható.
          }
        },
      },
    }
  )
}
