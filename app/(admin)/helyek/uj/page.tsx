import Link from 'next/link'
import { LocationForm } from '../LocationForm'
import { createLocation } from '../actions'

export default function NewLocationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Új tárhely</h1>
          <p className="mt-1 text-sm text-slate-500">
            A teljes kód a sor/polc/polcsor/tárhely mezőkből generálódik.
          </p>
        </div>
        <Link
          href="/helyek"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <LocationForm action={createLocation} submitLabel="Létrehozás" />
      </div>
    </div>
  )
}
