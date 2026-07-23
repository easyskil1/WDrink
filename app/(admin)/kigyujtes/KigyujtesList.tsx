'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS } from '@/lib/stock'
import type { BetaroltItem } from './page'
import { kigyujtAction, selejtKigyujtesAction } from './actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const fieldLabel = 'text-xs font-medium text-slate-500'

function Row({ item }: { item: BetaroltItem }) {
  const router = useRouter()
  const [mode, setMode] = useState<'kigyujt' | 'selejt'>('kigyujt')
  const [qty, setQty] = useState(String(item.mennyiseg))
  const [selejtOk, setSelejtOk] = useState('serult')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const n = parseInt(qty, 10)
    if (!n || n <= 0 || n > item.mennyiseg)
      return setError(`Mennyiség 1 és ${item.mennyiseg} között.`)

    setPending(true)
    const res =
      mode === 'kigyujt'
        ? await kigyujtAction({ stock_item_id: item.id, mennyiseg: n })
        : await selejtKigyujtesAction({
            stock_item_id: item.id,
            mennyiseg: n,
            selejt_ok: selejtOk,
            megjegyzes: megjegyzes.trim() || null,
          })
    setPending(false)
    if (res.error) return setError(res.error)
    router.refresh()
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 ${
        item.fefo ? 'border-green-300' : 'border-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-slate-900">
          {item.product_nev}
          {item.fefo && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              FEFO ajánlott
            </span>
          )}
        </span>
        <span className="text-sm text-slate-500">
          {KISZERELES_LABEL[item.kiszereles as KiszerelesTipus] ?? item.kiszereles}
          {' · '}
          <span className="font-semibold text-slate-700">{item.mennyiseg} db</span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        {item.teljes_kod ? `Hely: ${item.teljes_kod}` : 'Hely: —'}
        {item.lot_szam ? ` · LOT: ${item.lot_szam}` : ''}
        {item.lejarat_datum ? ` · lejárat: ${item.lejarat_datum}` : ''}
      </p>

      <div className="mt-3 inline-flex rounded-md border border-slate-200 p-0.5 text-sm">
        <button
          type="button"
          onClick={() => setMode('kigyujt')}
          className={`rounded px-3 py-1 font-medium ${
            mode === 'kigyujt' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Kigyűjt
        </button>
        <button
          type="button"
          onClick={() => setMode('selejt')}
          className={`rounded px-3 py-1 font-medium ${
            mode === 'selejt' ? 'bg-red-600 text-white' : 'text-slate-600'
          }`}
        >
          Selejt
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Mennyiség (db)</span>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
            className={input}
          />
        </label>
        {mode === 'selejt' && (
          <>
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Selejt oka</span>
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
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className={fieldLabel}>Megjegyzés</span>
              <input
                value={megjegyzes}
                onChange={(e) => setMegjegyzes(e.target.value)}
                className={input}
              />
            </label>
          </>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${
            mode === 'kigyujt'
              ? 'bg-slate-900 hover:bg-slate-800'
              : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          {pending ? 'Mentés…' : mode === 'kigyujt' ? 'Kigyűjtés' : 'Selejtezés'}
        </button>
      </div>
    </div>
  )
}

export function KigyujtesList({ items }: { items: BetaroltItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
        Nincs betárolt tétel. Előbb tárolj be a pufferből.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Row key={item.id} item={item} />
      ))}
    </div>
  )
}
