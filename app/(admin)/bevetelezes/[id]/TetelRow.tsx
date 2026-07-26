'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { StockStatusz } from '@/lib/stock'
import { korrigalBevetelezesTetel, sztornoBevetelezesTetel } from '../actions'

export type TetelKorrekcio = {
  id: string
  /** Előjeles delta alapegységben. */
  delta: number
  megjegyzes: string | null
  created_at: string
}

export type TetelData = {
  stock_item_id: string
  termek: string
  kiszereles: string
  /** Egy kiszerelés hány alapegység (db). */
  unit_mult: number
  /** A bevételezéskor naplózott darabszám. */
  bevetelezett_db: number
  /** A tétel jelenlegi darabszáma (korrekciók után). */
  jelenlegi_db: number
  lot_szam: string | null
  lejarat_datum: string | null
  statusz: StockStatusz
  statusz_label: string
  bevetelezve: string
  korrekciok: TetelKorrekcio[]
}

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

/** A pufferen túl mozgott tételnél a javítás következményekkel jár. */
const MOZGOTT: StockStatusz[] = ['betarolva', 'kigyujtve', 'kiadva']

export function TetelRow({
  noteId,
  tetel,
}: {
  noteId: string
  tetel: TetelData
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [db, setDb] = useState(String(tetel.jelenlegi_db))
  const [lot, setLot] = useState(tetel.lot_szam ?? '')
  const [lejarat, setLejarat] = useState(tetel.lejarat_datum ?? '')
  const [megjegyzes, setMegjegyzes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSztorno, setConfirmSztorno] = useState(false)

  const ujDb = Number.parseInt(db, 10)
  const dbOk = Number.isFinite(ujDb) && ujDb >= 0
  const delta = dbOk ? ujDb - tetel.jelenlegi_db : 0
  const dirty =
    (dbOk && ujDb !== tetel.jelenlegi_db) ||
    lot !== (tetel.lot_szam ?? '') ||
    lejarat !== (tetel.lejarat_datum ?? '')

  const mozgott = MOZGOTT.includes(tetel.statusz)
  const sztornozott = tetel.jelenlegi_db === 0

  async function save() {
    if (!dbOk) return setError('A mennyiség nem lehet negatív.')
    setError(null)
    setPending(true)
    const res = await korrigalBevetelezesTetel({
      note_id: noteId,
      stock_item_id: tetel.stock_item_id,
      uj_mennyiseg_alap: ujDb,
      lot_szam: lot.trim() || null,
      lejarat_datum: lejarat || null,
      megjegyzes: megjegyzes.trim() || null,
    })
    setPending(false)
    if (res.error) return setError(res.error)
    setMegjegyzes('')
    setOpen(false)
    router.refresh()
  }

  async function sztorno() {
    setError(null)
    setPending(true)
    const res = await sztornoBevetelezesTetel({
      note_id: noteId,
      stock_item_id: tetel.stock_item_id,
      megjegyzes: megjegyzes.trim() || null,
    })
    setPending(false)
    if (res.error) return setError(res.error)
    setConfirmSztorno(false)
    setMegjegyzes('')
    setOpen(false)
    router.refresh()
  }

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            {tetel.termek}
            {sztornozott && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                sztornózva
              </span>
            )}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {tetel.kiszereles} ·{' '}
            <span className="font-semibold text-slate-800 tabular-nums">
              {tetel.jelenlegi_db} db
            </span>
            {tetel.jelenlegi_db !== tetel.bevetelezett_db && (
              <span className="text-slate-400">
                {' '}
                (bevételezve: {tetel.bevetelezett_db} db)
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {tetel.statusz_label}
            {tetel.lot_szam && <> · LOT {tetel.lot_szam}</>}
            {tetel.lejarat_datum && <> · lejárat {tetel.lejarat_datum}</>}
            {' · '}
            {dt(tetel.bevetelezve)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {open ? 'Mégse' : 'Javítás'}
        </button>
      </div>

      {/* Korrekciós előzmény */}
      {tetel.korrekciok.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-slate-100 pt-3">
          {tetel.korrekciok.map((k) => (
            <li key={k.id} className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span
                className={`font-semibold tabular-nums ${
                  k.delta < 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {k.delta > 0 ? `+${k.delta}` : k.delta} db
              </span>
              <span>{dt(k.created_at)}</span>
              {k.megjegyzes && <span className="text-slate-400">· {k.megjegyzes}</span>}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4">
          {mozgott && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Ez a tétel már <strong>{tetel.statusz_label.toLowerCase()}</strong> -
              a mennyiség javítása a további lépésekkel (betárolás, kigyűjtés,
              kiszállítás) eltérést okozhat. A javítás korrekciós mozgásként
              naplózódik, tehát visszakövethető.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Mennyiség (db)
              <input
                type="number"
                min={0}
                value={db}
                onChange={(e) => setDb(e.target.value)}
                className={input}
              />
              {dbOk && delta !== 0 && (
                <span
                  className={`text-xs font-medium ${
                    delta < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta} db korrekció
                </span>
              )}
              <span className="text-xs font-normal text-slate-400">
                1 {tetel.kiszereles} = {tetel.unit_mult} db
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              LOT szám
              <input
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                className={input}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Lejárati dátum
              <input
                type="date"
                value={lejarat}
                onChange={(e) => setLejarat(e.target.value)}
                className={input}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Javítás oka (a naplóba kerül)
            <input
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
              placeholder="pl. Elszámolási hiba a szállítólevélhez képest"
              className={input}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-slate-800 disabled:opacity-40"
            >
              {pending ? 'Mentés…' : 'Javítás mentése'}
            </button>

            {!sztornozott && (
              <>
                {confirmSztorno ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={sztorno}
                      disabled={pending}
                      className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition enabled:hover:bg-rose-700 disabled:opacity-40"
                    >
                      Igen, sztornó
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSztorno(false)}
                      className="px-2 py-2 text-sm text-slate-500 hover:underline"
                    >
                      Nem
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSztorno(true)}
                    className="rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  >
                    Sztornó (0 db)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
