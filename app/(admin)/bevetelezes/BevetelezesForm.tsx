'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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

// Nettó űrtartalom kiírása, pl. "0,5 l" / "500 ml" (magyar tizedesvessző).
function fmtUrtartalom(c: {
  netto_urtartalom?: number | null
  urtartalom_egyseg?: 'ml' | 'l' | null
}): string {
  if (c.netto_urtartalom == null || !c.urtartalom_egyseg) return ''
  return `${c.netto_urtartalom.toLocaleString('hu-HU')} ${c.urtartalom_egyseg}`
}

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

  // A beszállító szállítólevél száma - a bevételezés elsődleges azonosítója.
  const [szlSzam, setSzlSzam] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Melyik tétel Vonalkód/kereső mezőjéhez tartozó találati lista van nyitva.
  const [openKey, setOpenKey] = useState<number | null>(null)

  function patch(key: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...p } : r)))
  }
  function onBarcode(key: number, code: string) {
    // A wizard keresőjéhez igazítva: előbb pontos vonalkód (szkennelés), majd
    // ha nincs, részleges vonalkód VAGY név alapján keresünk. Csak akkor
    // töltjük ki a terméket, ha a találat egyértelmű (pontosan egy).
    const raw = code.trim()
    const q = raw.toLowerCase()
    let hit = byBarcode.get(raw)
    if (!hit && q) {
      const matches = catalog.filter(
        (c) =>
          (c.vonalkod ?? '').toLowerCase().includes(q) ||
          c.product_nev.toLowerCase().includes(q)
      )
      if (matches.length === 1) hit = matches[0]
    }
    patch(key, { barcode: code, ...(hit ? { unit_id: hit.unit_id } : {}) })
  }

  // A wizard keresőjével azonos: név VAGY (részleges) vonalkód szerint szűr.
  function suggestionsFor(text: string): UnitCatalogItem[] {
    const q = text.trim().toLowerCase()
    if (!q) return []
    return catalog
      .filter(
        (c) =>
          c.product_nev.toLowerCase().includes(q) ||
          (c.vonalkod ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }

  // Találatra kattintva: kiválasztjuk a kiszerelést. A mezőben a TERMÉK NEVE
  // jelenik meg (nem a vonalkód) - a mentéshez csak az unit_id kell.
  function pickUnit(key: number, c: UnitCatalogItem) {
    patch(key, { unit_id: c.unit_id, barcode: c.product_nev })
    setOpenKey(null)
  }

  async function onSubmit() {
    setError(null)
    setSuccess(null)

    if (!szlSzam.trim()) return setError('Adj meg szállítólevél számot.')
    if (!supplierId) return setError('Válassz beszállítót.')

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
        // Dinamikus import: a supabase-js csak feltöltéskor töltődik.
        const { createClient } = await import('@/lib/supabase/client')
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
        supplier_id: supplierId,
        szallitolevel_szam: szlSzam,
        datum: datum || null,
        fenykep_url: fenykepUrl,
        items,
      })
      setPending(false)
      if (res.error) return setError(res.error)

      // A szállítólevél számot SZÁNDÉKOSAN nem nullázzuk: ugyanahhoz a papírhoz
      // több körben is felvihetők tételek (a RPC hozzáfűz, nem nyit új levelet).
      setSuccess(
        res.uj_level === false
          ? `A tételek a meglévő ${res.szallitolevel_szam} szállítólevélhez fűzve. A tételek pufferbe kerültek.`
          : `Bevételezés mentve a ${res.szallitolevel_szam} szállítólevélre (belső azonosító: ${res.sorszam}). A tételek pufferbe kerültek.`
      )
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
      {/* Minden egy kártyában: fejléc adatok, elválasztó, majd a tételek. */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        {/* Négy mező egy sorban (nagy nézet), 2x2 közepesen, egymás alatt mobilon. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Elsődleges azonosító: a beszállító papírján szereplő szám. */}
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Szállítólevél szám
            <input
              value={szlSzam}
              onChange={(e) => setSzlSzam(e.target.value)}
              placeholder="pl. 12345"
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
          {/*
            Rejtett input stílusozott címkében (a wizard mintája): így nincs a
            böngésző natív "Nincs fájl kiválasztva" szövege, ami a szűk hasábban
            levágódott. A fájlnév truncate-tel fér el, a teljes név a title-ben.
          */}
          <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Fotó (opcionális)
            <div className="flex items-center gap-1.5">
              <label className="min-w-0 flex-1 cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  // A value nullázása kell, hogy ugyanaz a fájl eltávolítás után
                  // újra kiválasztva is kiváltsa az onChange-et.
                  onClick={(e) => {
                    e.currentTarget.value = ''
                  }}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <span className="block truncate" title={file?.name}>
                  {file ? file.name : 'Fotó választása'}
                </span>
              </label>
              {file && (
                <button
                  type="button"
                  aria-label="Fotó eltávolítása"
                  onClick={() => setFile(null)}
                  className="shrink-0 rounded-md px-2 py-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* A súgó a rács ALATT egy sorban - a mezőn belül megnyújtotta a sort. */}
        <p className="mt-3 text-xs text-slate-400">
          Ha a szállítólevél szám ehhez a beszállítóhoz már létezik, a tételek a
          meglévő szállítólevélhez fűződnek, nem nyílik új.
        </p>

        <div className="my-6 border-t border-slate-200" />

        {/* Tételek */}
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

        <div className="mt-4 flex flex-col gap-3">
          {rows.map((r, idx) => {
            const unit = r.unit_id ? byId.get(r.unit_id) : undefined
            const menny = parseInt(r.mennyiseg, 10) || 0
            const alap = unit ? menny * unit.mennyiseg_alapegysegben : 0
            const isMulti =
              unit &&
              (unit.kiszereles === 'karton' || unit.kiszereles === 'raklap') &&
              menny > 0
            const suggestions = suggestionsFor(r.barcode)

            return (
              <div key={r.key} className="rounded-lg border border-slate-200 p-3 sm:p-4">
                {/* Fejléc: sorszám + átváltás-visszajelző balra, selejt és Törlés jobbra. */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">
                      {idx + 1}. tétel
                    </span>
                    {unit && menny > 0 && (
                      <span
                        className={`rounded-md px-2 py-1 text-xs ${
                          isMulti
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {menny} × {KISZERELES_LABEL[unit.kiszereles as KiszerelesTipus]}
                        {fmtUrtartalom(unit) && ` (${fmtUrtartalom(unit)})`}
                        {' = '}
                        <span className="font-semibold">{alap} db</span> (alapegység)
                        {isMulti && ' - biztosan ennyi?'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
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
                </div>

                {/*
                  Mind az öt mező EGY sorban (12 hasábos rács: 3+3+2+2+2 - a
                  három részlet-mező egyforma széles), tabletnél 3 hasáb, mobilon
                  2. A min-w-0 kell, hogy a rács-elemek a tartalmuk alá
                  zsugorodhassanak.
                */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-12">
                  <div className="relative col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-3 lg:col-span-6">
                    <span className={fieldLabel}>Termék keresése (név vagy vonalkód)</span>
                    <div className="flex min-w-0 gap-1">
                      <input
                        value={r.barcode}
                        onChange={(e) => {
                          onBarcode(r.key, e.target.value)
                          setOpenKey(r.key)
                        }}
                        onFocus={() => setOpenKey(r.key)}
                        // Késleltetés, hogy a listaelem kattintása még lefusson.
                        onBlur={() => setTimeout(() => setOpenKey(null), 150)}
                        placeholder="Keresés kézi hozzáadáshoz…"
                        className={input}
                      />
                      <ScanButton
                        onScan={(text) => {
                          // Talált vonalkód → a NÉV kerül a mezőbe (pickUnit),
                          // nem a beolvasott szám. Ha nincs találat, marad a kód.
                          const hit = byBarcode.get(text.trim())
                          if (hit) pickUnit(r.key, hit)
                          else onBarcode(r.key, text)
                        }}
                      />
                    </div>
                    {/* Kézi kereső találatok - a wizard (mobilos bevételezés) mintája. */}
                    {openKey === r.key && r.barcode.trim() && (
                      <div className="absolute left-0 right-0 top-full z-20 mt-1 flex max-h-64 flex-col gap-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-lg">
                        {suggestions.map((c) => (
                          <button
                            key={c.unit_id}
                            type="button"
                            // onMouseDown a blur ELŐTT fut, így nem záródik be korábban.
                            onMouseDown={(e) => {
                              e.preventDefault()
                              pickUnit(r.key, c)
                            }}
                            className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
                          >
                            <span className="truncate font-medium text-slate-800">
                              {c.product_nev}
                            </span>
                            <span className="shrink-0 text-xs text-slate-400">
                              + {KISZERELES_LABEL[c.kiszereles as KiszerelesTipus] ??
                                c.kiszereles}
                              {fmtUrtartalom(c) && ` · ${fmtUrtartalom(c)}`}
                            </span>
                          </button>
                        ))}
                        {suggestions.length === 0 && (
                          <p className="px-2 py-3 text-center text-sm text-slate-400">
                            Nincs találat.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
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
                  <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
                    <span className={fieldLabel}>LOT szám</span>
                    <input
                      value={r.lot_szam}
                      onChange={(e) => patch(r.key, { lot_szam: e.target.value })}
                      className={input}
                    />
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 lg:col-span-2">
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
