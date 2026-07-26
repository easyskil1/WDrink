import Link from 'next/link'
import { getSuppliers } from '@/lib/cached-data'
import { ProductForm } from '../ProductForm'
import { createProduct } from '../actions'

export default async function NewProductPage() {
  const suppliers = await getSuppliers()

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-2xl font-semibold text-slate-900">
          Új termék
        </h1>
        <Link
          href="/termekek"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>
      <div className="mt-6">
        <ProductForm
          action={createProduct}
          suppliers={suppliers}
          submitLabel="Létrehozás"
        />
      </div>
    </div>
  )
}
