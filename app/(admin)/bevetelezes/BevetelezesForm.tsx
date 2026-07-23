'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS, type UnitCatalogItem } from '@/lib/stock'
import type { Supplier } from '@/lib/suppliers'
import { ScanButton } from '@/components/ScanButton'
import { createBevetelezes, type BevItem } from './actions'

type Row = {
  key: number
  unit_id: string
  barcode: string
  mennyiseg: string
  lot_szam: string
  lejarat_datum: string
  selejt: boolean
  selejt_ok: string
}

let counter = 0
function emptyRow(): Row {
  return {
    key: counter++,
    unit_id: '',
    barcode: '',
    mennyiseg: '1',
    lot_szam: '',
    lejarat_datum: '',
    selejt: false,
    selejt_ok: 'serult',
  }
}

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const fieldLabel = 'text-xs font-medium text-slate-500'

export function BevetelezesForm({
  suppliers,
  catalog,
  defaultDatum,
}: {
  suppliers: Supplier[]
  catalog: UnitCatalogItem[]
  defaultDatum: string
}) {
  const router = useRouter()
  const byBarcode = useMemo(() => {
    const m = new Map<string, UnitCatalogItem>()
    for (const c of catalog) if (c.vonalkod) m.set(c.vonalkod, c)
    return m
  }, [catalog])
  const byId = useMemo(() => {
    const m = new Map<string, UnitCatalogItem>()
    for (const c of catalog) m.set(c.unit_id, c)
    return m
  }, [catalog])

  const [supplierId, setSupplierId] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function patch(key: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)))
  }
  function onBarcode(key: number, code: string) {
    const hit = byBarcode.get(code.trim())
    patch(key, { barcode: code, ...(hit ? { unit_id: hit.unit_id } : {}) })
  }

  async function onSubmit() {
    setError(null)
    setSuccess(null)

    const items: BevItem[] = []
    for (const r of rows) {
      if (!r.unit_id) return setError('Minden tételnél válassz terméket/kiszerelést.')
      const menny = parseInt(r.mennyiseg, 10)
      if (!menny || menny <= 0)
        return setError('Minden tételnél adj meg pozitív mennyiséget.')
      items.push({
        product_unit_id: r.unit_id,
        mennyiseg: menny,
        lot_szam: r.lot_szam.trim() || null,
        lejarat_datum: r.lejarat_datum || null,
        selejt: r.selejt,
        selejt_ok: r.selejt ? r.selejt_ok : null,
      })
    }

    setPending(true)
    try {
      let fenykepUrl: string | null = null
      if (file) {
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('delivery-notes')
          .upload(path, file)
        if (upErr) {
          setPending(false)
          return setError('Fotó feltöltési hiba: ' + upErr.message)
        }
        fenykepUrl = path
      }

      const res = await createBevetelezes({
        supplier_id: supplierId || null,
        datum: datum || null,
        fenykep_url: fenykepUrl,
        items,
      })
      setPending(false)
      if (res.error) return setError(res.error)

      setSuccess(`Bevételezés mentve: ${res.sorszam}. A tételek pufferbe kerültek.`)
      setRows([emptyRow()])
      setFile(null)
      router.refresh()
    } catch (e) {
      setPending(false)
      setError('Váratlan hiba: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Fejléc adatok */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Beszállító
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={input}
            >
              <option value="">—</option>
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
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            Szállítólevél fotó (opcionális)
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700"
            />
          </label>
        </div>
      </section>

      {/* Tételek */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Tételek</h2>
          <button
            type="button"
            onClick={() => setRows((p) => [...p, emptyRow()])}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            + Tétel
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {rows.map((r, idx) => {
            const unit = r.unit_id ? byId.get(r.unit_id) : undefined
            const menny = parseInt(r.mennyiseg, 10) || 0
            const alap = unit ? menny * unit.mennyiseg_alapegysegben : 0
            const isMulti =
              unit &&
              (unit.kiszereles === 'karton' || unit.kiszereles === 'raklap') &&
              menny > 0

            return (
              <div key={r.key} className="rounded-lg border border-slate-200 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {idx + 1}. tétel
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((p) => p.filter((x) => x.key !== r.key))
                      }
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Törlés
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>Vonalkód</span>
                    <div className="flex gap-1">
                      <input
                        value={r.barcode}
                        onChange={(e) => onBarcode(r.key, e.target.value)}
                        inputMode="numeric"
                        placeholder="beolvas / kézi"
                        className={input}
                      />
                      <ScanButton onScan={(text) => onBarcode(r.key, text)} />
                    </div>
                  </label>
                  <label className="col-span-2 flex flex-col gap-1 sm:col-span-2">
                    <span className={fieldLabel}>Termék / kiszerelés</span>
                    <select
                      value={r.unit_id}
                      onChange={(e) => patch(r.key, { unit_id: e.target.value })}
                      className={input}
                    >
                      <option value="">— válassz —</option>
                      {catalog.map((c) => (
                        <option key={c.unit_id} value={c.unit_id}>
                          {c.product_nev} ·{' '}
                          {KISZERELES_LABEL[c.kiszereles as KiszerelesTipus] ??
                            c.kiszereles}
                          {c.vonalkod ? ` (${c.vonalkod})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>
                      Mennyiség ({unit ? KISZERELES_LABEL[unit.kiszereles as KiszerelesTipus] : 'db'})
                    </span>
                    <input
                      value={r.mennyiseg}
                      onChange={(e) => patch(r.key, { mennyiseg: e.target.value })}
                      inputMode="numeric"
                      className={input}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>LOT szám</span>
                    <input
                      value={r.lot_szam}
                      onChange={(e) => patch(r.key, { lot_szam: e.target.value })}
                      className={input}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className={fieldLabel}>Lejárat</span>
                    <input
                      type="date"
                      value={r.lejarat_datum}
                      onChange={(e) =>
                        patch(r.key, { lejarat_datum: e.target.value })
                      }
                      className={input}
                    />
                  </label>
                </div>

                {/* Átváltás megerősítése (karton/raklap) */}
                {unit && menny > 0 && (
                  <div
                    className={`mt-3 rounded-md px-3 py-2 text-sm ${
                      isMulti
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {menny} × {KISZERELES_LABEL[unit.kiszereles as KiszerelesTipus]}
                    {' = '}
                    <span className="font-semibold">{alap} db</span> (alapegység)
                    {isMulti && ' — biztosan ennyi?'}
                  </div>
                )}

                {/* Selejt opció */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={r.selejt}
                      onChange={(e) => patch(r.key, { selejt: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Sérülten érkezett (selejt)
                  </label>
                  {r.selejt && (
                    <select
                      value={r.selejt_ok}
                      onChange={(e) => patch(r.key, { selejt_ok: e.target.value })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {SELEJT_OK_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : 'Bevételezés mentése'}
        </button>
      </div>
    </div>
  )
}
