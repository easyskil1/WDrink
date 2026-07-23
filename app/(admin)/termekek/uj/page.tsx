import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/suppliers'
import { ProductForm } from '../ProductForm'
import { createProduct } from '../actions'

export default async function NewProductPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('suppliers').select('*').order('nev')
  const suppliers = (data ?? []) as Supplier[]

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/termekek" className="hover:underline">
          Termékek
        </Link>{' '}
        / Új termék
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">Új termék</h1>
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
