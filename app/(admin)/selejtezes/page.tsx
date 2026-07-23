import { createClient } from '@/lib/supabase/server'
import { STOCK_STATUSZ_LABEL, type StockStatusz } from '@/lib/stock'
import { SelejtezesList } from './SelejtezesList'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  statusz: StockStatusz
  products: { nev: string } | null
  product_units: { kiszereles: string } | null
  locations: { teljes_kod: string } | null
}

export type OnHandItem = {
  id: string
  product_nev: string
  kiszereles: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg: number
  statusz: StockStatusz
  statusz_label: string
  teljes_kod: string | null
}

type SearchParams = Promise<{ q?: string }>

export default async function SelejtezesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('stock_items')
    .select(
      'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, statusz, products!inner(nev), product_units(kiszereles), locations(teljes_kod)'
    )
    .in('statusz', ['puffer', 'betarolva', 'kigyujtve'])
    .gt('mennyiseg_alapegysegben', 0)
    .order('created_at', { ascending: true })

  const q = sp.q?.trim()
  if (q) query = query.ilike('products.nev', `%${q}%`)

  const { data } = await query
  const items: OnHandItem[] = ((data ?? []) as unknown as StockRow[]).map((s) => ({
    id: s.id,
    product_nev: s.products?.nev ?? '(ismeretlen)',
    kiszereles: s.product_units?.kiszereles ?? '',
    lot_szam: s.lot_szam,
    lejarat_datum: s.lejarat_datum,
    mennyiseg: s.mennyiseg_alapegysegben,
    statusz: s.statusz,
    statusz_label: STOCK_STATUSZ_LABEL[s.statusz],
    teljes_kod: s.locations?.teljes_kod ?? null,
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Selejtezés</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bármely készleten lévő tétel kivezetése. Kötelező indok, opcionális
        fotó.
      </p>

      <form method="get" className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={sp.q ?? ''}
          placeholder="Termék keresése…"
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Keresés
        </button>
      </form>

      <div className="mt-4">
        <SelejtezesList items={items} />
      </div>
    </div>
  )
}
