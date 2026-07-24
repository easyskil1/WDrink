import { createClient } from '@/lib/supabase/server'
import { BetarolasWizard } from './BetarolasWizard'

type StockRow = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg_alapegysegben: number
  products: { nev: string } | null
  product_units: { kiszereles: string; vonalkod: string | null } | null
}

export type PufferItem = {
  id: string
  lot_szam: string | null
  lejarat_datum: string | null
  mennyiseg: number
  product_nev: string
  kiszereles: string
  vonalkod: string | null
}

export type LocationOption = { id: string; teljes_kod: string; tipus: string }

export default async function BetarolasWizardPage() {
  const supabase = await createClient()

  const [{ data: stockData }, { data: locData }] = await Promise.all([
    supabase
      .from('stock_items')
      .select(
        'id, lot_szam, lejarat_datum, mennyiseg_alapegysegben, products(nev), product_units(kiszereles, vonalkod)'
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
      vonalkod: s.product_units?.vonalkod ?? null,
    })
  )
  const locations = (locData ?? []) as LocationOption[]

  return <BetarolasWizard items={items} locations={locations} />
}
