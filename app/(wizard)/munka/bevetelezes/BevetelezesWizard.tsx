'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS, type UnitCatalogItem } from '@/lib/stock'
import type { Supplier } from '@/lib/suppliers'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { StepTitle, DoneSummary } from '@/components/wizard/parts'
import { createBevetelezes } from '@/app/(admin)/bevetelezes/actions'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

/**
 * Egy felvett tétel a nyitott szállítólevél alatt.
 *
 * A LOT/lejárat/sérülés soronként adható meg (korábban csak az "egy tétel"
 * módban volt ilyen; a módválasztó megszűnt, ezért ide került).
 */
type Line = {
  /** Stabil sor-azonosító: ugyanaz a termék több sorban is szerepelhet (más LOT). */
  id: number
  unit: UnitCatalogItem
  qty: number
  lot: string
  lejarat: string
  damaged: boolean
  selejtOk: string
  /** A "Részletek" panel nyitva van-e (alapból csukva, hogy ne lassítsa a gyors utat). */
  open: boolean
}

export function BevetelezesWizard({
  suppliers,
  catalog,
  defaultDatum,
}: {
  suppliers: Supplier[]
  catalog: UnitCatalogItem[]
  defaultDatum: string
}) {
  const router = useRouter()
  const nextLineId = useRef(1)

  const [step, setStep] = useState<1 | 2>(1)

  // --- Szállítólevél (a bevételezés elsődleges azonosítója) ---
  const [szlSzam, setSzlSzam] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [file, setFile] = useState<File | null>(null)

  // --- Tételek ---
  const [lines, setLines] = useState<Line[]>([])
  const [query, setQuery] = useState('')

  const [done, setDone] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  const szlOk = szlSzam.trim().length > 0 && supplierId !== ''
  const supplierNev = suppliers.find((s) => s.id === supplierId)?.nev

  /** Teljes újrakezdés: új szállítólevél. */
  function resetAll() {
    setStep(1)
    setSzlSzam('')
    setSupplierId('')
    setDatum(defaultDatum)
    setFile(null)
    setLines([])
    setQuery('')
    setDone(null)
    setError(null)
    router.refresh()
  }

  /** A szállítólevél nyitva marad, csak a tétellista ürül. */
  function ujTetelek() {
    setLines([])
    setQuery('')
    setDone(null)
    setError(null)
    setStep(2)
    router.refresh()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog.slice(0, 30)
    return catalog.filter(
      (c) =>
        c.product_nev.toLowerCase().includes(q) ||
        (c.vonalkod ?? '').includes(q)
    )
  }, [catalog, query])

  /**
   * Tétel hozzáadása. Ugyanaz a vonalkód újra = +1 az utolsó olyan soron, amely
   * még "jellemzés nélküli" (nincs LOT/lejárat, nem sérült). Ha a soron már van
   * LOT vagy sérülés-jelölés, ÚJ sor jön létre - így ugyanabból a termékből
   * több LOT is bevételezhető egy szállítólevélre.
   */
  function addLine(u: UnitCatalogItem) {
    setLines((prev) => {
      const idx = prev.findIndex(
        (l) =>
          l.unit.unit_id === u.unit_id &&
          !l.lot.trim() &&
          !l.lejarat &&
          !l.damaged
      )
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 }
        return copy
      }
      return [
        {
          id: nextLineId.current++,
          unit: u,
          qty: 1,
          lot: '',
          lejarat: '',
          damaged: false,
          selejtOk: 'serult',
          open: false,
        },
        ...prev,
      ]
    })
    setError(null)
  }

  function patchLine(id: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }
  function removeLine(id: number) {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }

  async function submit() {
    if (lines.length === 0 || !szlOk) return
    setError(null)
    setSubmitting(true)
    try {
      let fenykepUrl: string | null = null
      if (file) {
        // Dinamikus import: a supabase-js csak feltöltéskor töltődik,
        // nem terheli a kezdeti kliens-bundle-t.
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('delivery-notes')
          .upload(path, file)
        if (upErr) {
          setSubmitting(false)
          return setError('Fotó feltöltési hiba: ' + upErr.message)
        }
        fenykepUrl = path
      }

      const res = await createBevetelezes({
        supplier_id: supplierId,
        szallitolevel_szam: szlSzam,
        datum: datum || null,
        fenykep_url: fenykepUrl,
        items: lines.map((l) => ({
          product_unit_id: l.unit.unit_id,
          mennyiseg: l.qty,
          lot_szam: l.lot.trim() || null,
          lejarat_datum: l.lejarat || null,
          selejt: l.damaged,
          selejt_ok: l.damaged ? l.selejtOk : null,
        })),
      })
      setSubmitting(false)
      if (res.error) return setError(res.error)

      // A fotó felkerült, ne töltsük fel újra a következő körben.
      setFile(null)

      const osszDb = lines.reduce(
        (sum, l) => sum + l.qty * l.unit.mennyiseg_alapegysegben,
        0
      )
      setDone([
        `Szállítólevél: ${res.szallitolevel_szam}`,
        ...(supplierNev ? [`Beszállító: ${supplierNev}`] : []),
        ...(res.uj_level === false
          ? ['A tételek a már meglévő szállítólevélhez fűződtek.']
          : []),
        `Tételek: ${lines.length} féle (${osszDb} db összesen)`,
        ...lines.map(
          (l) =>
            `• ${l.unit.product_nev}: ${l.qty} ${kisz(l.unit.kiszereles)}` +
            (l.lot.trim() ? ` · LOT ${l.lot.trim()}` : '') +
            (l.damaged ? ' · sérült' : '')
        ),
        `Belső azonosító: ${res.sorszam}`,
      ])
    } catch (e) {
      setSubmitting(false)
      setError('Váratlan hiba: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  // ---- Záró összegzés ----
  if (done) {
    return (
      <WizardShell
        title="Bevételezve"
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={ujTetelek}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              További tétel ugyanerre a szállítólevélre
            </button>
            <Link
              href="/munka/betarolas"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tovább a betárolásra
            </Link>
            <button
              type="button"
              onClick={resetAll}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Új szállítólevél
            </button>
            <button
              type="button"
              onClick={cancel}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Vissza a főoldalra
            </button>
          </div>
        }
      >
        <DoneSummary title="Sikeres bevételezés" lines={done} />
      </WizardShell>
    )
  }

  return (
    <WizardShell
      // A nyitott szállítólevél végig látszik a fejlécben.
      title={step === 2 && szlOk ? `Szállítólevél: ${szlSzam.trim()}` : 'Bevételezés'}
      onCancel={cancel}
      onBack={step === 2 ? () => setStep(1) : undefined}
      onNext={
        step === 2 && lines.length > 0 && !submitting ? submit : undefined
      }
      nextLabel={submitting ? 'Mentés…' : `Bevételezés (${lines.length})`}
      footer={
        step === 1 ? (
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              disabled={!szlOk}
              onClick={() => {
                setError(null)
                setStep(2)
              }}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-slate-800 disabled:opacity-40"
            >
              Bevételezés
            </button>
            <Link
              href="/bevetelezes"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Korábbi bevételezések
            </Link>
          </div>
        ) : undefined
      }
    >
      {/* ===== 1. lépés - Szállítólevél ===== */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <StepTitle
            title="Szállítólevél"
            hint="A beszállító szállítólevél száma alá kerül minden most bevételezett tétel."
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Szállítólevél szám
            </span>
            <input
              value={szlSzam}
              onChange={(e) => setSzlSzam(e.target.value)}
              placeholder="A beszállító papírján szereplő szám"
              autoComplete="off"
              // Elsődleges mező: nagyobb, hangsúlyosabb a többinél.
              className={`${inputCls} py-4 text-lg font-semibold`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Beszállító</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputCls}
            >
              <option value="">- Válassz beszállítót -</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nev}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Dátum</span>
            <input
              type="date"
              value={datum}
              onChange={(e) => setDatum(e.target.value)}
              className={inputCls}
            />
          </label>

          {/* A fotó a SZÁLLÍTÓLEVÉLHEZ tartozik, nem a tételhez. */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-500">
              Szállítólevél fotó (opcionális)
            </span>
            <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <span className="text-sm font-medium text-slate-700">
                {file ? `Kiválasztva: ${file.name}` : 'Fotó készítése / kiválasztása'}
              </span>
            </label>
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="self-start text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
              >
                Fotó eltávolítása
              </button>
            )}
          </div>

          {!szlOk && (
            <p className="text-xs text-slate-400">
              A szállítólevél szám és a beszállító megadása kötelező.
            </p>
          )}
        </div>
      )}

      {/* ===== 2. lépés - Tételek ===== */}
      {step === 2 && (
        <div className="flex flex-col gap-3">
          <StepTitle
            title="Tételek szkennelése"
            hint="Olvasd be egymás után a termékeket (ugyanaz újra = +1). LOT vagy lejárat csak ha kell - nyisd ki a Részleteket."
          />

          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{szlSzam.trim()}</span>
            {supplierNev && <> · {supplierNev}</>} · {datum}
          </div>

          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés kézi hozzáadáshoz…"
              className={inputCls}
            />
            <ScanButton
              title="Termék vonalkód"
              allowContinuous
              onScan={(text) => {
                const hit = catalog.find(
                  (c) => c.vonalkod && c.vonalkod === text.trim()
                )
                if (hit) addLine(hit)
                else
                  setError(
                    `Nincs ilyen vonalkódú termék: ${text}. Előbb vedd fel a terméket (vagy a vonalkódját) a Termékek menüben.`
                  )
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Kézi kereső találatok */}
          {query.trim() && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {filtered.slice(0, 8).map((c) => (
                <button
                  key={c.unit_id}
                  type="button"
                  onClick={() => {
                    addLine(c)
                    setQuery('')
                  }}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  <span className="truncate font-medium text-slate-800">
                    {c.product_nev}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    + {kisz(c.kiszereles)}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-slate-400">
                  Nincs találat.
                </p>
              )}
            </div>
          )}

          {/* Felvett tételek */}
          <div className="mt-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Felvett tételek ({lines.length})
            </p>
            {lines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
                Még nincs tétel. Olvass be egy vonalkódot.
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">
                          {l.unit.product_nev}
                        </p>
                        <p className="text-xs text-slate-400">
                          {kisz(l.unit.kiszereles)} ·{' '}
                          {l.qty * l.unit.mennyiseg_alapegysegben} db
                          {l.lot.trim() && <> · LOT {l.lot.trim()}</>}
                          {l.damaged && (
                            <span className="text-rose-600"> · sérült</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label="Csökkentés"
                          onClick={() =>
                            patchLine(l.id, { qty: Math.max(1, l.qty - 1) })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold text-slate-600 active:bg-slate-100"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-base font-bold text-slate-900">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Növelés"
                          onClick={() => patchLine(l.id, { qty: l.qty + 1 })}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold text-slate-600 active:bg-slate-100"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          aria-label="Törlés"
                          onClick={() => removeLine(l.id)}
                          className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Részletek - alapból csukva, hogy a gyors út ne lassuljon. */}
                    <button
                      type="button"
                      onClick={() => patchLine(l.id, { open: !l.open })}
                      className="mt-2 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
                    >
                      {l.open ? 'Részletek elrejtése' : 'Részletek (LOT, lejárat, sérülés)'}
                    </button>

                    {l.open && (
                      <div className="mt-2 flex flex-col gap-3 border-t border-slate-100 pt-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-500">
                            LOT szám
                          </span>
                          <input
                            value={l.lot}
                            onChange={(e) => patchLine(l.id, { lot: e.target.value })}
                            className={inputCls}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-slate-500">
                            Lejárati dátum
                          </span>
                          <input
                            type="date"
                            value={l.lejarat}
                            onChange={(e) =>
                              patchLine(l.id, { lejarat: e.target.value })
                            }
                            className={inputCls}
                          />
                        </label>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={l.damaged}
                              onChange={(e) =>
                                patchLine(l.id, { damaged: e.target.checked })
                              }
                              className="h-4 w-4"
                            />
                            Sérülten érkezett (selejt)
                          </label>
                          {l.damaged && (
                            <select
                              value={l.selejtOk}
                              onChange={(e) =>
                                patchLine(l.id, { selejtOk: e.target.value })
                              }
                              className={`${inputCls} mt-2`}
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
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WizardShell>
  )
}
