'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS } from '@/lib/stock'
import type { OnHandItem } from './page'
import { selejtOnalloAction } from './actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const fieldLabel = 'text-xs font-medium text-slate-500'

function Row({ item }: { item: OnHandItem }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState(String(item.mennyiseg))
  const [selejtOk, setSelejtOk] = useState('serult')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setError(null)
    const n = parseInt(qty, 10)
    if (!n || n <= 0 || n > item.mennyiseg)
      return setError(`Mennyiség 1 és ${item.mennyiseg} között.`)

    setPending(true)
    try {
      let docUrl: string | null = null
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('selejt-notes')
          .upload(path, file)
        if (upErr) {
          setPending(false)
          return setError('Fotó feltöltési hiba: ' + upErr.message)
        }
        docUrl = path
      }

      const res = await selejtOnalloAction({
        stock_item_id: item.id,
        mennyiseg: n,
        selejt_ok: selejtOk,
        megjegyzes: megjegyzes.trim() || null,
        dokumentum_url: docUrl,
      })
      setPending(false)
      if (res.error) return setError(res.error)
      router.refresh()
    } catch (e) {
      setPending(false)
      setError('Váratlan hiba: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 font-medium text-slate-900">
          {item.product_nev}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {item.statusz_label}
          </span>
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

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        >
          Selejtezés
        </button>
      ) : (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className={fieldLabel}>Indok *</span>
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
              <span className={fieldLabel}>Mennyiség (db)</span>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                inputMode="numeric"
                className={input}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
              <span className={fieldLabel}>Megjegyzés</span>
              <input
                value={megjegyzes}
                onChange={(e) => setMegjegyzes(e.target.value)}
                className={input}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1 sm:col-span-3">
              <span className={fieldLabel}>Fotó / dokumentum (opcionális)</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
              />
            </label>
          </div>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {pending ? 'Selejtezés…' : 'Megerősít'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Mégse
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SelejtezesList({ items }: { items: OnHandItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
        Nincs selejtezhető készlettétel.
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
