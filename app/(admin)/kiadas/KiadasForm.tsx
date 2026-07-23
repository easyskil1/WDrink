'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import type { PickedItem } from './page'
import { kiadAction } from './actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

export function KiadasForm({
  items,
  defaultDatum,
}: {
  items: PickedItem[]
  defaultDatum: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [vevo, setVevo] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))
    )
  }

  async function submit() {
    setError(null)
    if (selected.size === 0) return setError('Válassz ki legalább egy tételt.')
    if (!vevo.trim()) return setError('Add meg a vevő nevét.')

    setPending(true)
    const res = await kiadAction({
      vevo_nev: vevo,
      datum: datum || null,
      stock_item_ids: [...selected],
    })
    setPending(false)
    if (res.error) return setError(res.error)
    if (res.noteId) router.push(`/kiadas/${res.noteId}/szallitolevel`)
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
        Nincs kigyűjtött tétel. Előbb gyűjts ki a Kigyűjtés menüben.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Vevő neve *
            <input value={vevo} onChange={(e) => setVevo(e.target.value)} className={input} />
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
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Kigyűjtött tételek
          </h2>
          <button
            type="button"
            onClick={toggleAll}
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            {selected.size === items.length ? 'Egyik se' : 'Mind'}
          </button>
        </div>

        <ul className="mt-3 flex flex-col gap-2">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selected.has(it.id)}
                  onChange={() => toggle(it.id)}
                  className="h-4 w-4"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-slate-900">
                    {it.product_nev}
                  </span>
                  <span className="ml-2 text-sm text-slate-500">
                    {KISZERELES_LABEL[it.kiszereles as KiszerelesTipus] ??
                      it.kiszereles}{' '}
                    · {it.mennyiseg} db
                    {it.lot_szam ? ` · LOT ${it.lot_szam}` : ''}
                    {it.lejarat_datum ? ` · lej. ${it.lejarat_datum}` : ''}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Kiadás…' : 'Kiadás + szállítólevél'}
        </button>
      </div>
    </div>
  )
}
