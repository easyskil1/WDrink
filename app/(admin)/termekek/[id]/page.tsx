import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Product, ProductUnit } from '@/lib/products'
import { getSuppliers } from '@/lib/cached-data'
import { ProductForm } from '../ProductForm'
import { updateProduct } from '../actions'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: unitData }, suppliers] =
    await Promise.all([
      supabase.from('products').select('*').eq('id', id).maybeSingle<Product>(),
      supabase
        .from('product_units')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true }),
      getSuppliers(),
    ])

  if (!product) notFound()

  const units = (unitData ?? []) as ProductUnit[]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">
            Termék szerkesztése
          </h1>
          {/* A morzsasor helyett itt jelenik meg, melyik termékről van szó. */}
          <p className="mt-1 truncate text-sm text-slate-500">{product.nev}</p>
        </div>
        <Link
          href="/termekek"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>
      <div className="mt-6">
        <ProductForm
          action={updateProduct.bind(null, id)}
          suppliers={suppliers}
          initial={product}
          initialUnits={units}
          submitLabel="Mentés"
        />
      </div>
    </div>
  )
}
