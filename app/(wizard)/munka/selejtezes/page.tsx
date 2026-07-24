import { createClient } from '@/lib/supabase/server'
import { STOCK_STATUSZ_LABEL, type StockStatusz } from '@/lib/stock'
import { SelejtezesWizard } from './SelejtezesWizard'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  statusz: StockStatusz
  products: { nev: string } | null
  product_units: { kiszereles: string; vonalkod: string | null } | null
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
  vonalkod: string | null
}

export default async function SelejtezesWizardPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stock_items')
    .select(
      'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, statusz, products!inner(nev), product_units(kiszereles, vonalkod), locations(teljes_kod)'
    )
    .in('statusz', ['puffer', 'betarolva', 'kigyujtve'])
    .gt('mennyiseg_alapegysegben', 0)
    .order('created_at', { ascending: true })

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
    vonalkod: s.product_units?.vonalkod ?? null,
  }))

  return <SelejtezesWizard items={items} />
}
