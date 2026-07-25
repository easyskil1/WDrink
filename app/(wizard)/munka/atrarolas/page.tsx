import { createClient } from '@/lib/supabase/server'
import { getActiveLocations } from '@/lib/cached-data'
import { AtrarolasWizard } from './AtrarolasWizard'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  location_id: string | null
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
  location_id: string | null
  teljes_kod: string | null
  vonalkod: string | null
}

export type LocationOption = { id: string; teljes_kod: string }

export default async function AtrarolasWizardPage() {
  const supabase = await createClient()

  const [{ data: stockData }, locations] = await Promise.all([
    supabase
      .from('stock_items')
      .select(
        'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, location_id, products(nev), product_units(kiszereles, vonalkod), locations(teljes_kod)'
      )
      .eq('statusz', 'betarolva')
      .gt('mennyiseg_alapegysegben', 0)
      .order('created_at', { ascending: true }),
    getActiveLocations(),
  ])

  const items: BetaroltItem[] = ((stockData ?? []) as unknown as StockRow[]).map(
    (s) => ({
      id: s.id,
      product_nev: s.products?.nev ?? '(ismeretlen)',
      kiszereles: s.product_units?.kiszereles ?? '',
      lot_szam: s.lot_szam,
      lejarat_datum: s.lejarat_datum,
      mennyiseg: s.mennyiseg_alapegysegben,
      location_id: s.location_id,
      teljes_kod: s.locations?.teljes_kod ?? null,
      vonalkod: s.product_units?.vonalkod ?? null,
    })
  )

  return <AtrarolasWizard items={items} locations={locations} />
}
