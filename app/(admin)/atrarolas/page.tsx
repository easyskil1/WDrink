import { createClient } from '@/lib/supabase/server'
import { AtrarolasList } from './AtrarolasList'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  location_id: string | null
  products: { nev: string } | null
  product_units: { kiszereles: string } | null
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
}

export type LocationOption = { id: string; teljes_kod: string }

export default async function AtrarolasPage() {
  const supabase = await createClient()

  const [{ data: stockData }, { data: locData }] = await Promise.all([
    supabase
      .from('stock_items')
      .select(
        'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, location_id, products(nev), product_units(kiszereles), locations(teljes_kod)'
      )
      .eq('statusz', 'betarolva')
      .gt('mennyiseg_alapegysegben', 0)
      .order('created_at', { ascending: true }),
    supabase
      .from('locations')
      .select('id, teljes_kod')
      .eq('aktiv', true)
      .order('teljes_kod'),
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
    })
  )
  const locations = (locData ?? []) as LocationOption[]

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Átrárolás</h1>
      <p className="mt-1 text-sm text-slate-500">
        Betárolt tétel áthelyezése másik tárhelyre. A globális készletet nem
        érinti.
      </p>

      <div className="mt-6">
        <AtrarolasList items={items} locations={locations} />
      </div>
    </div>
  )
}
