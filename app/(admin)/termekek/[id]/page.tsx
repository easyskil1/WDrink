import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Product, ProductUnit } from '@/lib/products'
import type { Supplier } from '@/lib/suppliers'
import { ProductForm } from '../ProductForm'
import { updateProduct } from '../actions'

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: product }, { data: unitData }, { data: supplierData }] =
    await Promise.all([
      supabase.from('products').select('*').eq('id', id).maybeSingle<Product>(),
      supabase
        .from('product_units')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: true }),
      supabase.from('suppliers').select('*').order('nev'),
    ])

  if (!product) notFound()

  const units = (unitData ?? []) as ProductUnit[]
  const suppliers = (supplierData ?? []) as Supplier[]

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/termekek" className="hover:underline">
          Termékek
        </Link>{' '}
        / {product.nev}
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">
        Termék szerkesztése
      </h1>
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
