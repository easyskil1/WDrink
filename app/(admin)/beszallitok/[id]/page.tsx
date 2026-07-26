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
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">
            Beszállító szerkesztése
          </h1>
          {/* A morzsasor helyett itt jelenik meg, melyik beszállítóról van szó. */}
          <p className="mt-1 truncate text-sm text-slate-500">{supplier.nev}</p>
        </div>
        <Link
          href="/beszallitok"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>
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
