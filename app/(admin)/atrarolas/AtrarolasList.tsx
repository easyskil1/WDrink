'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { ScanButton } from '@/components/ScanButton'
import type { BetaroltItem, LocationOption } from './page'
import { atrarolAction } from './actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const fieldLabel = 'text-xs font-medium text-slate-500'

function Row({
  item,
  locations,
}: {
  item: BetaroltItem
  locations: LocationOption[]
}) {
  const router = useRouter()
  const [celId, setCelId] = useState('')
  const [qty, setQty] = useState(String(item.mennyiseg))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = locations.filter((l) => l.id !== item.location_id)

  async function submit() {
    setError(null)
    const n = parseInt(qty, 10)
    if (!celId) return setError('Válassz cél tárhelyet.')
    if (!n || n <= 0 || n > item.mennyiseg)
      return setError(`Mennyiség 1 és ${item.mennyiseg} között.`)

    setPending(true)
    const res = await atrarolAction({
      stock_item_id: item.id,
      cel_location_id: celId,
      mennyiseg: n,
    })
    setPending(false)
    if (res.error) return setError(res.error)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-slate-900">{item.product_nev}</span>
        <span className="text-sm text-slate-500">
          {KISZERELES_LABEL[item.kiszereles as KiszerelesTipus] ?? item.kiszereles}
          {' · '}
          <span className="font-semibold text-slate-700">{item.mennyiseg} db</span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        Jelenlegi hely:{' '}
        <span className="font-medium text-slate-600">
          {item.teljes_kod ?? '—'}
        </span>
        {item.lot_szam ? ` · LOT: ${item.lot_szam}` : ''}
        {item.lejarat_datum ? ` · lejárat: ${item.lejarat_datum}` : ''}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <span className={fieldLabel}>Cél tárhely</span>
          <div className="flex gap-1">
            <select
              value={celId}
              onChange={(e) => setCelId(e.target.value)}
              className={input}
            >
              <option value="">— válassz —</option>
              {targets.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.teljes_kod}
                </option>
              ))}
            </select>
            <ScanButton
              title="Tárhely QR"
              onScan={(text) => {
                const loc = targets.find((l) => l.teljes_kod === text.trim())
                if (loc) setCelId(loc.id)
                else setError(`Nincs ilyen (cél) tárhely: ${text}`)
              }}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Mennyiség (db)</span>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="numeric"
            className={input}
          />
        </label>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : 'Átrárolás'}
        </button>
      </div>
    </div>
  )
}

export function AtrarolasList({
  items,
  locations,
}: {
  items: BetaroltItem[]
  locations: LocationOption[]
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
        Nincs betárolt tétel az átrároláshoz.
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Row key={item.id} item={item} locations={locations} />
      ))}
    </div>
  )
}
