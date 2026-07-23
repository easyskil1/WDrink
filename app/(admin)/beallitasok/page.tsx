import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CompanyForm, type CompanySettings } from './CompanyForm'

export default async function BeallitasokPage() {
  await requireAdmin()
  const supabase = await createClient()
  const { data } = await supabase
    .from('company_settings')
    .select('cegnev, adoszam, cim, jovedeki_engedelyszam, felir_azonosito')
    .eq('id', true)
    .maybeSingle<CompanySettings>()

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
