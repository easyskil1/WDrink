import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Supplier } from '@/lib/suppliers'
import { deleteSupplier } from './actions'

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('suppliers')
    .select('*')
    .order('nev', { ascending: true })
  const suppliers = (data ?? []) as Supplier[]

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Beszállítók</h1>
          <p className="mt-1 text-sm text-slate-500">{suppliers.length} beszállító</p>
        </div>
        <Link
          href="/beszallitok/uj"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Új
        </Link>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {suppliers.length === 0 && (
          <li className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            Még nincs beszállító.
          </li>
        )}
        {suppliers.map((s) => (
          <li
            key={s.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{s.nev}</p>
              <p className="text-sm text-slate-500">
                {[s.adoszam, s.kapcsolattarto, s.cim].filter(Boolean).join(' · ') ||
                  '—'}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href={`/beszallitok/${s.id}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Szerkeszt
              </Link>
              <form action={deleteSupplier.bind(null, s.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Töröl
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
