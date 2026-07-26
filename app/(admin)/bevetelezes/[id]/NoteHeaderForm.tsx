'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Supplier } from '@/lib/suppliers'
import { updateBevetelezesNote } from '../actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

export function NoteHeaderForm({
  noteId,
  suppliers,
  initial,
  fenykepUrl,
}: {
  noteId: string
  suppliers: Supplier[]
  initial: {
    szallitolevel_szam: string
    supplier_id: string
    datum: string
    ekaer_szam: string
  }
  fenykepUrl: string | null
}) {
  const router = useRouter()
  const [szl, setSzl] = useState(initial.szallitolevel_szam)
  const [supplierId, setSupplierId] = useState(initial.supplier_id)
  const [datum, setDatum] = useState(initial.datum)
  const [ekaer, setEkaer] = useState(initial.ekaer_szam)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const dirty =
    szl !== initial.szallitolevel_szam ||
    supplierId !== initial.supplier_id ||
    datum !== initial.datum ||
    ekaer !== initial.ekaer_szam

  async function save() {
    setError(null)
    setSuccess(null)
    setPending(true)
    const res = await updateBevetelezesNote({
      note_id: noteId,
      supplier_id: supplierId || null,
      szallitolevel_szam: szl,
      datum: datum || null,
      ekaer_szam: ekaer || null,
      // A fotó cseréje itt nem támogatott, csak megtekintés - a meglévőt
      // a szerver oldali coalesce megtartja.
      fenykep_url: null,
    })
    setPending(false)
    if (res.error) return setError(res.error)
    setSuccess('Mentve.')
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Szállítólevél szám
          <input
            value={szl}
            onChange={(e) => setSzl(e.target.value)}
            autoComplete="off"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Beszállító
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={input}
          >
            <option value="">- Válassz beszállítót -</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nev}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Dátum
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          EKAER szám (opcionális)
          <input
            value={ekaer}
            onChange={(e) => setEkaer(e.target.value)}
            autoComplete="off"
            className={input}
          />
        </label>
        {fenykepUrl && (
          <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Szállítólevél fotó
            <p className="truncate rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500">
              {fenykepUrl}
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-slate-800 disabled:opacity-40"
        >
          {pending ? 'Mentés…' : 'Mentés'}
        </button>
        <p className="text-xs text-slate-400">
          A fejléc módosítása nem érinti a készletet.
        </p>
      </div>
    </div>
  )
}
