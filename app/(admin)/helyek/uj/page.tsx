import Link from 'next/link'
import { LocationForm } from '../LocationForm'
import { createLocation } from '../actions'

export default function NewLocationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/helyek" className="hover:underline">
          Raktári helyek
        </Link>{' '}
        / Új tárhely
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">Új tárhely</h1>
      <p className="mt-1 text-sm text-slate-500">
        A teljes kód a sor/polc/polcsor/tárhely mezőkből generálódik.
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <LocationForm action={createLocation} submitLabel="Létrehozás" />
      </div>
    </div>
  )
}
