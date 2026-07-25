import { requireAdmin } from '@/lib/auth'
import { getCompanySettings } from '@/lib/cached-data'
import { CompanyForm } from './CompanyForm'

export default async function BeallitasokPage() {
  await requireAdmin()
  const data = await getCompanySettings()

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Cégadatok</h1>
      <p className="mt-1 text-sm text-slate-500">
        A szállítóleveleken és bizonylatokon megjelenő adatok (jövedéki
        engedélyszám, FELIR).
      </p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <CompanyForm initial={data ?? null} />
      </div>
    </div>
  )
}
