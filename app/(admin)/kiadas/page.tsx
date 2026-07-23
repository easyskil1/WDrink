import { createClient } from '@/lib/supabase/server'
import { KiadasForm } from './KiadasForm'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  products: { nev: string } | null
  product_units: { kiszereles: string } | null
}

export type PickedItem = {
  id: string
  product_nev: string
  kiszereles: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg: number
}

export default async function KiadasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stock_items')
    .select(
      'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, products(nev), product_units(kiszereles)'
    )
    .eq('statusz', 'kigyujtve')
    .gt('mennyiseg_alapegysegben', 0)
    .order('created_at', { ascending: true })

  const items: PickedItem[] = ((data ?? []) as unknown as StockRow[]).map((s) => ({
    id: s.id,
    product_nev: s.products?.nev ?? '(ismeretlen)',
    kiszereles: s.product_units?.kiszereles ?? '',
    lot_szam: s.lot_szam,
    lejarat_datum: s.lejarat_datum,
    mennyiseg: s.mennyiseg_alapegysegben,
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Kiadás</h1>
      <p className="mt-1 text-sm text-slate-500">
        Kigyűjtött tételek összesítése egy kiadási bizonylatba, szállítólevéllel.
      </p>

      <div className="mt-6">
        <KiadasForm
          items={items}
          defaultDatum={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </div>
  )
}
