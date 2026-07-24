import { createClient } from '@/lib/supabase/server'
import { KiszallitasWizard } from './KiszallitasWizard'

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

export default async function KiszallitasWizardPage() {
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
    <KiszallitasWizard
      items={items}
      defaultDatum={new Date().toISOString().slice(0, 10)}
    />
  )
}
