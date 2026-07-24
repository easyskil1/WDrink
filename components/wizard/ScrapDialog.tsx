'use client'

import { useState } from 'react'
import { SELEJT_OK_OPTIONS } from '@/lib/stock'

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

/**
 * Selejt-modal a wizard „Selejt” gombjához.
 *
 * Az adott lépés termék/mennyiség kontextusát kapja (`productName`, `maxQty`),
 * és a modul saját selejt-actionjét hívja az `onSubmit`-en át. Siker esetén
 * `onSuccess(summary)` — a wizard ebből mutat záró összegzést.
 */
export function ScrapDialog({
  productName,
  maxQty,
  onSubmit,
  onClose,
  onSuccess,
}: {
  productName: string
  maxQty: number
  onSubmit: (args: {
    mennyiseg: number
    selejt_ok: string
    megjegyzes: string | null
  }) => Promise<{ error?: string }>
  onClose: () => void
  onSuccess: (summary: string[]) => void
}) {
  const [qty, setQty] = useState(String(maxQty))
  const [selejtOk, setSelejtOk] = useState('serult')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const n = parseInt(qty, 10)
    if (!n || n <= 0 || n > maxQty)
      return setError(`Mennyiség 1 és ${maxQty} között.`)

    setPending(true)
    const res = await onSubmit({
      mennyiseg: n,
      selejt_ok: selejtOk,
      megjegyzes: megjegyzes.trim() || null,
    })
    setPending(false)
    if (res.error) return setError(res.error)

    const okLabel =
      SELEJT_OK_OPTIONS.find((o) => o.value === selejtOk)?.label ?? selejtOk
    onSuccess([
      `Termék: ${productName}`,
      `Selejtezett mennyiség: ${n} db`,
      `Indok: ${okLabel}`,
      ...(megjegyzes.trim() ? [`Megjegyzés: ${megjegyzes.trim()}`] : []),
    ])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Selejtezés</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Bezárás
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">{productName}</p>

        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Mennyiség (db) · max {maxQty}
            </span>
            <input
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputMode="numeric"
              className={input}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Indok</span>
            <select
              value={selejtOk}
              onChange={(e) => setSelejtOk(e.target.value)}
              className={input}
            >
              {SELEJT_OK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Megjegyzés (opcionális)
            </span>
            <input
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
              className={input}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : 'Selejtezés rögzítése'}
        </button>
      </div>
    </div>
  )
}
