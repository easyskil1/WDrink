import { createClient } from '@/lib/supabase/server'
import { BetarolasList } from './BetarolasList'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  products: { nev: string } | null
  product_units: { kiszereles: string } | null
}

export type PufferItem = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg: number
  product_nev: string
  kiszereles: string
}

export type LocationOption = { id: string; teljes_kod: string; tipus: string }

export default async function BetarolasPage() {
  const supabase = await createClient()

  const [{ data: stockData }, { data: locData }] = await Promise.all([
    supabase
      .from('stock_items')
      .select(
        'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, products(nev), product_units(kiszereles)'
      )
      .eq('statusz', 'puffer')
      .gt('mennyiseg_alapegysegben', 0)
      .order('created_at', { ascending: true }),
    supabase
      .from('locations')
      .select('id, teljes_kod, tipus')
      .eq('aktiv', true)
      .order('teljes_kod'),
  ])

  const items: PufferItem[] = ((stockData ?? []) as unknown as StockRow[]).map(
    (s) => ({
      id: s.id,
      lot_szam: s.lot_szam,
      lejarat_datum: s.lejarat_datum,
      mennyiseg: s.mennyiseg_alapegysegben,
      product_nev: s.products?.nev ?? '(ismeretlen)',
      kiszereles: s.product_units?.kiszereles ?? '',
    })
  )
  const locations = (locData ?? []) as LocationOption[]

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Betárolás</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pufferben lévő tételek polcra helyezése. Egy tétel több helyre is
        szétosztható.
      </p>

      <div className="mt-6">
        <BetarolasList items={items} locations={locations} />
      </div>
    </div>
  )
}
