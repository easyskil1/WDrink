import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/suppliers'
import { SupplierForm } from '../SupplierForm'
import { updateSupplier } from '../actions'

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .maybeSingle<Supplier>()

  if (!supplier) notFound()

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/beszallitok" className="hover:underline">
          Beszállítók
        </Link>{' '}
        / {supplier.nev}
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">
        Beszállító szerkesztése
      </h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <SupplierForm
          action={updateSupplier.bind(null, id)}
          initial={supplier}
          submitLabel="Mentés"
        />
      </div>
    </div>
  )
}
