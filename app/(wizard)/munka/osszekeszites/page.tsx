import { createClient } from '@/lib/supabase/server'
import { OsszekeszitesWizard } from './OsszekeszitesWizard'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  products: { nev: string } | null
  product_units: { kiszereles: string; vonalkod: string | null } | null
  locations: { teljes_kod: string } | null
}

export type BetaroltItem = {
  id: string
  product_nev: string
  kiszereles: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg: number
  teljes_kod: string | null
  vonalkod: string | null
  fefo: boolean
}

export default async function OsszekeszitesWizardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stock_items')
    .select(
      'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, products(nev), product_units(kiszereles, vonalkod), locations(teljes_kod)'
    )
    .eq('statusz', 'betarolva')
    .gt('mennyiseg_alapegysegben', 0)
    .order('lejarat_datum', { ascending: true, nullsFirst: false })

  const rows = (data ?? []) as unknown as StockRow[]

  // Termékenként az első (legkorábbi lejáratú) tétel a FEFO-ajánlott.
  const seen = new Set<string>()
  const items: BetaroltItem[] = rows.map((s) => {
    const nev = s.products?.nev ?? '(ismeretlen)'
    const fefo = !seen.has(nev)
    seen.add(nev)
    return {
      id: s.id,
      product_nev: nev,
      kiszereles: s.product_units?.kiszereles ?? '',
      lot_szam: s.lot_szam,
      lejarat_datum: s.lejarat_datum,
      mennyiseg: s.mennyiseg_alapegysegben,
      teljes_kod: s.locations?.teljes_kod ?? null,
      vonalkod: s.product_units?.vonalkod ?? null,
      fefo,
    }
  })
  items.sort(
    (a, b) =>
      a.product_nev.localeCompare(b.product_nev, 'hu') ||
      (a.lejarat_datum ?? '9999').localeCompare(b.lejarat_datum ?? '9999')
  )

  return <OsszekeszitesWizard items={items} />
}
