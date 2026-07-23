import Link from 'next/link'
import { SupplierForm } from '../SupplierForm'
import { createSupplier } from '../actions'

export default function NewSupplierPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/beszallitok" className="hover:underline">
          Beszállítók
        </Link>{' '}
        / Új
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">Új beszállító</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <SupplierForm action={createSupplier} submitLabel="Létrehozás" />
      </div>
    </div>
  )
}
