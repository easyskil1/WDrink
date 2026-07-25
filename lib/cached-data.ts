import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Supplier } from '@/lib/suppliers'

/**
 * Ritkán változó törzsadatok cache-elt olvasása (E fázis).
 *
 * Miért service-role (createAdminClient) kliens? Az unstable_cache callback NEM
 * férhet a kérés cookie-jaihoz (dinamikus adat), így a request-scoped auth
 * kliens nem használható. A cache-elt adatok nem user-specifikusak és minden
 * oldal amúgy is requireStaff() mögött van, ezért a globális, RLS-t megkerülő
 * olvasás itt biztonságos.
 *
 * Invalidálás: a megfelelő action-ök revalidateTag('suppliers' | 'locations' |
 * 'company_settings')-et hívnak mutációkor. A `revalidate` egy órás backstop.
 */

const HOUR = 3600

export type CompanySettings = {
  cegnev: string | null
  adoszam: string | null
  cim: string | null
  jovedeki_engedelyszam: string | null
  felir_azonosito: string | null
  keszlet_lista_limit: number
}

/** Készletlisták felső megjelenítési korlátja (fallback, ha nincs beállítva). */
export const DEFAULT_KESZLET_LISTA_LIMIT = 500

/** A beállított készletlista-limit (cache-elt cégadatból), fallbackkel. */
export async function getKeszletListaLimit(): Promise<number> {
  const cs = await getCompanySettings()
  return cs?.keszlet_lista_limit ?? DEFAULT_KESZLET_LISTA_LIMIT
}

export type ActiveLocation = {
  id: string
  teljes_kod: string
  tipus: string
}

/** Beszállítók név szerint. Tag: 'suppliers'. */
export const getSuppliers = unstable_cache(
  async (): Promise<Supplier[]> => {
    const supabase = createAdminClient()
    const { data } = await supabase.from('suppliers').select('*').order('nev')
    return (data ?? []) as Supplier[]
  },
  ['suppliers-list'],
  { tags: ['suppliers'], revalidate: HOUR }
)

/** Cégadatok (egyetlen sor, id=true). Tag: 'company_settings'. */
export const getCompanySettings = unstable_cache(
  async (): Promise<CompanySettings | null> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('company_settings')
      .select(
        'cegnev, adoszam, cim, jovedeki_engedelyszam, felir_azonosito, keszlet_lista_limit'
      )
      .eq('id', true)
      .maybeSingle()
    return (data ?? null) as CompanySettings | null
  },
  ['company-settings'],
  { tags: ['company_settings'], revalidate: HOUR }
)

/** Aktív raktári helyek teljes_kod szerint (dropdownokhoz). Tag: 'locations'. */
export const getActiveLocations = unstable_cache(
  async (): Promise<ActiveLocation[]> => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('locations')
      .select('id, teljes_kod, tipus')
      .eq('aktiv', true)
      .order('teljes_kod')
    return (data ?? []) as ActiveLocation[]
  },
  ['active-locations'],
  { tags: ['locations'], revalidate: HOUR }
)
