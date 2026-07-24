import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/suppliers'
import type { UnitCatalogItem } from '@/lib/stock'
import { BevetelezesWizard } from './BevetelezesWizard'

type UnitRow = {
  id: string
  kiszereles: string
  vonalkod: string | null
  mennyiseg_alapegysegben: number
  products: { id: string; nev: string } | null
}

export default async function BevetelezesWizardPage() {
  const supabase = await createClient()

  const [{ data: supplierData }, { data: unitData }] = await Promise.all([
    supabase.from('suppliers').select('*').order('nev'),
    supabase
      .from('product_units')
      .select(
        'id, kiszereles, vonalkod, mennyiseg_alapegysegben, products!inner(id, nev, aktiv)'
      )
      .eq('products.aktiv', true),
  ])

  const suppliers = (supplierData ?? []) as Supplier[]
  const catalog: UnitCatalogItem[] = ((unitData ?? []) as unknown as UnitRow[])
    .filter((u) => u.products)
    .map((u) => ({
      unit_id: u.id,
      product_id: u.products!.id,
      product_nev: u.products!.nev,
      kiszereles: u.kiszereles,
      vonalkod: u.vonalkod,
      mennyiseg_alapegysegben: u.mennyiseg_alapegysegben,
    }))
    .sort((a, b) => a.product_nev.localeCompare(b.product_nev, 'hu'))

  return (
    <BevetelezesWizard
      suppliers={suppliers}
      catalog={catalog}
      defaultDatum={new Date().toISOString().slice(0, 10)}
    />
  )
}
