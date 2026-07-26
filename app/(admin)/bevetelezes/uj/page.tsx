import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSuppliers } from '@/lib/cached-data'
import type { UnitCatalogItem } from '@/lib/stock'
import { BevetelezesForm } from '../BevetelezesForm'

type UnitRow = {
  id: string
  kiszereles: string
  vonalkod: string | null
  mennyiseg_alapegysegben: number
  products: { id: string; nev: string } | null
}

export default async function BevetelezesUjPage() {
  const supabase = await createClient()

  const [suppliers, { data: unitData }] = await Promise.all([
    getSuppliers(),
    supabase
      .from('product_units')
      .select(
        'id, kiszereles, vonalkod, mennyiseg_alapegysegben, products!inner(id, nev, aktiv)'
      )
      .eq('products.aktiv', true),
  ])
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

  // max-w-7xl (mint a lista): a tétel-sor öt mezője csak így fér el egy sorban.
  return (
    <div className="mx-auto max-w-7xl">
      {/* Fejléc: cím balra, Vissza jobbra - a helyek/cimkek oldal mintája. */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Új bevételezés
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Áru fogadása szállítólevélre - a tételek pufferbe kerülnek, onnan
            lehet betárolni.
          </p>
        </div>
        <Link
          href="/bevetelezes"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>

      <div className="mt-6">
        <BevetelezesForm
          suppliers={suppliers}
          catalog={catalog}
          defaultDatum={new Date().toISOString().slice(0, 10)}
        />
      </div>
    </div>
  )
}
