import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  LOCATION_TIPUS_LABEL,
  LOCATION_TIPUS_OPTIONS,
  type Location,
} from '@/lib/locations'
import { toggleLocationActive } from './actions'

type SearchParams = Promise<{ sor?: string; tipus?: string; aktiv?: string }>

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('locations')
    .select('*')
    .order('teljes_kod', { ascending: true })

  if (sp.sor) query = query.ilike('sor', sp.sor)
  if (sp.tipus) query = query.eq('tipus', sp.tipus)
  if (sp.aktiv === 'aktiv') query = query.eq('aktiv', true)
  if (sp.aktiv === 'inaktiv') query = query.eq('aktiv', false)

  const { data, error } = await query
  const locations = (data ?? []) as Location[]

  // A címkenyomtatás linkje megőrzi a szűrést.
  const labelParams = new URLSearchParams()
  if (sp.sor) labelParams.set('sor', sp.sor)
  if (sp.tipus) labelParams.set('tipus', sp.tipus)
  if (sp.aktiv) labelParams.set('aktiv', sp.aktiv)
  const labelHref =
    '/helyek/cimkek' + (labelParams.toString() ? `?${labelParams}` : '')

  const input =
    'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500'

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Raktári helyek
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {locations.length} tárhely
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={labelHref}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Címkék nyomtatása
          </Link>
          <Link
            href="/helyek/uj"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            + Új tárhely
          </Link>
        </div>
      </div>

      {/* Szűrő */}
      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Sor
          <input name="sor" defaultValue={sp.sor ?? ''} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Típus
          <select name="tipus" defaultValue={sp.tipus ?? ''} className={input}>
            <option value="">Mind</option>
            {LOCATION_TIPUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Állapot
          <select name="aktiv" defaultValue={sp.aktiv ?? ''} className={input}>
            <option value="">Mind</option>
            <option value="aktiv">Aktív</option>
            <option value="inaktiv">Inaktív</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Szűrés
        </button>
        <Link
          href="/helyek"
          className="px-2 py-2 text-sm text-slate-500 hover:underline"
        >
          Törlés
        </Link>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600">
          Hiba a betöltéskor: {error.message}
        </p>
      )}

      {/* Táblázat */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Teljes kód</th>
              <th className="px-4 py-3">Típus</th>
              <th className="px-4 py-3">Állapot</th>
              <th className="px-4 py-3 text-right">Műveletek</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {locations.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Nincs a szűrésnek megfelelő tárhely.
                </td>
              </tr>
            )}
            {locations.map((loc) => (
              <tr key={loc.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-medium text-slate-900">
                  {loc.teljes_kod}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {LOCATION_TIPUS_LABEL[loc.tipus]}
                </td>
                <td className="px-4 py-3">
                  {loc.aktiv ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Aktív
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Inaktív
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/helyek/${loc.id}`}
                      className="font-medium text-slate-700 hover:underline"
                    >
                      Szerkeszt
                    </Link>
                    <form
                      action={toggleLocationActive.bind(
                        null,
                        loc.id,
                        !loc.aktiv
                      )}
                    >
                      <button
                        type="submit"
                        className="font-medium text-slate-500 hover:underline"
                      >
                        {loc.aktiv ? 'Deaktivál' : 'Aktivál'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
