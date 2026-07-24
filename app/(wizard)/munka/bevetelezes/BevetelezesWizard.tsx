'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS, type UnitCatalogItem } from '@/lib/stock'
import type { Supplier } from '@/lib/suppliers'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { StepTitle, SelectRow, QtyStepper, DoneSummary } from '@/components/wizard/parts'
import { createBevetelezes } from '@/app/(admin)/bevetelezes/actions'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

type Mode = 'single' | 'multi'
type MultiLine = { unit: UnitCatalogItem; qty: number }

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

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<Mode | null>(null)
  const [supplierId, setSupplierId] = useState('')
  const [datum, setDatum] = useState(defaultDatum)

  // Egy tétel mód
  const [unit, setUnit] = useState<UnitCatalogItem | null>(null)
  const [mennyiseg, setMennyiseg] = useState(1)
  const [lot, setLot] = useState('')
  const [lejarat, setLejarat] = useState('')
  const [damaged, setDamaged] = useState(false)
  const [selejtOk, setSelejtOk] = useState('serult')
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')

  // Több tétel mód
  const [lines, setLines] = useState<MultiLine[]>([])
  const [multiQuery, setMultiQuery] = useState('')

  const [done, setDone] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setMode(null)
    setSupplierId('')
    setDatum(defaultDatum)
    setUnit(null)
    setMennyiseg(1)
    setLot('')
    setLejarat('')
    setDamaged(false)
    setSelejtOk('serult')
    setFile(null)
    setQuery('')
    setLines([])
    setMultiQuery('')
    setDone(null)
    setError(null)
    router.refresh()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter(
      (c) =>
        c.product_nev.toLowerCase().includes(q) ||
        (c.vonalkod ?? '').includes(q)
    )
  }, [catalog, query])

  const multiFiltered = useMemo(() => {
    const q = multiQuery.trim().toLowerCase()
    if (!q) return catalog.slice(0, 30)
    return catalog.filter(
      (c) =>
        c.product_nev.toLowerCase().includes(q) ||
        (c.vonalkod ?? '').includes(q)
    )
  }, [catalog, multiQuery])

  function pickUnit(u: UnitCatalogItem) {
    setUnit(u)
    setMennyiseg(1)
    setError(null)
    setStep(3)
  }

  // --- Több tétel: lista kezelése ---
  function addLine(u: UnitCatalogItem) {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.unit.unit_id === u.unit_id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 }
        return copy
      }
      return [{ unit: u, qty: 1 }, ...prev]
    })
    setError(null)
  }
  function setLineQty(id: string, qty: number) {
    setLines((prev) =>
      prev.map((l) => (l.unit.unit_id === id ? { ...l, qty: Math.max(1, qty) } : l))
    )
  }
  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.unit.unit_id !== id))
  }

  async function submitSingle() {
    if (!unit) return
    setError(null)
    setSubmitting(true)
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
          setSubmitting(false)
          return setError('Fotó feltöltési hiba: ' + upErr.message)
        }
        fenykepUrl = path
      }

      const res = await createBevetelezes({
        supplier_id: supplierId || null,
        datum: datum || null,
        fenykep_url: fenykepUrl,
        items: [
          {
            product_unit_id: unit.unit_id,
            mennyiseg,
            lot_szam: lot.trim() || null,
            lejarat_datum: lejarat || null,
            selejt: damaged,
            selejt_ok: damaged ? selejtOk : null,
          },
        ],
      })
      setSubmitting(false)
      if (res.error) return setError(res.error)

      const db = mennyiseg * unit.mennyiseg_alapegysegben
      const supplierNev = suppliers.find((s) => s.id === supplierId)?.nev
      setDone([
        `Sorszám: ${res.sorszam}`,
        `Termék: ${unit.product_nev}`,
        `Mennyiség: ${mennyiseg} ${kisz(unit.kiszereles)} (${db} db)`,
        ...(supplierNev ? [`Beszállító: ${supplierNev}`] : []),
        ...(lot.trim() ? [`LOT: ${lot.trim()}`] : []),
        ...(lejarat ? [`Lejárat: ${lejarat}`] : []),
        ...(damaged
          ? [`Selejt: ${SELEJT_OK_OPTIONS.find((o) => o.value === selejtOk)?.label ?? selejtOk}`]
          : []),
      ])
    } catch (e) {
      setSubmitting(false)
      setError('Váratlan hiba: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  async function submitMulti() {
    if (lines.length === 0) return
    setError(null)
    setSubmitting(true)
    const res = await createBevetelezes({
      supplier_id: supplierId || null,
      datum: datum || null,
      fenykep_url: null,
      items: lines.map((l) => ({
        product_unit_id: l.unit.unit_id,
        mennyiseg: l.qty,
        lot_szam: null,
        lejarat_datum: null,
        selejt: false,
        selejt_ok: null,
      })),
    })
    setSubmitting(false)
    if (res.error) return setError(res.error)

    const supplierNev = suppliers.find((s) => s.id === supplierId)?.nev
    const osszDb = lines.reduce(
      (sum, l) => sum + l.qty * l.unit.mennyiseg_alapegysegben,
      0
    )
    setDone([
      `Sorszám: ${res.sorszam}`,
      ...(supplierNev ? [`Beszállító: ${supplierNev}`] : []),
      `Tételek: ${lines.length} féle (${osszDb} db összesen)`,
      ...lines.map((l) => `• ${l.unit.product_nev}: ${l.qty} ${kisz(l.unit.kiszereles)}`),
    ])
  }

  // ---- Záró összegzés ----
  if (done) {
    return (
      <WizardShell
        title="Bevételezve"
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <Link
              href="/munka/betarolas"
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              Tovább a betárolásra
            </Link>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Új bevételezés indítása
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

  // ---- Nincs termék a katalógusban ----
  if (catalog.length === 0) {
    return (
      <WizardShell
        title="Bevételezés"
        onCancel={cancel}
        footer={
          <button
            type="button"
            onClick={cancel}
            className="mx-auto block w-full max-w-md rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Vissza a főoldalra
          </button>
        }
      >
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-slate-400">
          Nincs aktív termék/kiszerelés. Előbb vegyél fel terméket.
        </div>
      </WizardShell>
    )
  }

  // A lábléc/Tovább logika a mód és a lépés függvényében.
  const onNext =
    step === 1
      ? undefined // az 1. lapon a mód-gombok léptetnek tovább
      : mode === 'multi'
        ? lines.length > 0 && !submitting
          ? submitMulti
          : undefined
        : step === 2
          ? undefined // termék kiválasztással lépünk tovább
          : step === 3
            ? mennyiseg > 0
              ? () => setStep(4)
              : undefined
            : step === 4
              ? submitting
                ? undefined
                : submitSingle
              : undefined

  const nextLabel =
    mode === 'multi'
      ? submitting
        ? 'Mentés…'
        : `Bevételezés (${lines.length})`
      : step === 4
        ? submitting
          ? 'Mentés…'
          : 'Bevételezés'
        : 'Tovább'

  return (
    <WizardShell
      title="Bevételezés"
      onCancel={cancel}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={onNext}
      nextLabel={nextLabel}
      footer={step === 1 ? <></> : undefined}
    >
      {/* 1. lépés - bevétel adatai + mód választás */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <StepTitle
            title="Bevétel adatai"
            hint="Add meg a beszállítót és a dátumot, majd válaszd, egy vagy több tételt veszel be."
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Beszállító</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className={inputCls}
            >
              <option value="">- Beszállító nélkül -</option>
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

          <div className="mt-2">
            <span className="text-xs font-medium text-slate-500">Bevételezés módja</span>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode('single')
                  setError(null)
                  setStep(2)
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-300 bg-white p-4 text-center active:scale-[0.98] hover:border-slate-400"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 12h6" /></svg>
                </span>
                <span className="text-sm font-semibold text-slate-800">Egy tétel</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('multi')
                  setError(null)
                  setStep(2)
                }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-slate-300 bg-white p-4 text-center active:scale-[0.98] hover:border-slate-400"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="16" width="18" height="4" rx="1" /></svg>
                </span>
                <span className="text-sm font-semibold text-slate-800">Több tétel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EGY TÉTEL mód ===== */}
      {/* 2. lépés - termék */}
      {step === 2 && mode === 'single' && (
        <div className="flex flex-col gap-3">
          <StepTitle
            title="Termék szkennelése"
            hint="Olvasd be a vonalkódot, vagy válaszd a listából."
          />
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés név / vonalkód szerint…"
              className={inputCls}
            />
            <ScanButton
              title="Termék vonalkód"
              onScan={(text) => {
                const hit = catalog.find((c) => c.vonalkod && c.vonalkod === text.trim())
                if (hit) pickUnit(hit)
                else setError(`Nincs ilyen vonalkódú termék: ${text}`)
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col gap-2">
            {filtered.map((c) => (
              <SelectRow key={c.unit_id} onClick={() => pickUnit(c)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">{c.product_nev}</span>
                  <span className="shrink-0 text-xs text-slate-400">{kisz(c.kiszereles)}</span>
                </div>
                {c.vonalkod && (
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{c.vonalkod}</p>
                )}
              </SelectRow>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Nincs találat.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. lépés - mennyiség + LOT + lejárat */}
      {step === 3 && mode === 'single' && unit && (
        <div className="flex flex-col gap-5">
          <StepTitle
            title="Mennyiség és tétel-adatok"
            hint={`${unit.product_nev} · ${kisz(unit.kiszereles)}`}
          />
          <QtyStepper
            value={mennyiseg}
            onChange={setMennyiseg}
            min={1}
            unit={kisz(unit.kiszereles)}
          />
          <p className="text-center text-sm text-slate-500">
            ={' '}
            <span className="font-semibold text-slate-800">
              {mennyiseg * unit.mennyiseg_alapegysegben} db
            </span>{' '}
            (alapegység)
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">LOT szám (opcionális)</span>
            <input value={lot} onChange={(e) => setLot(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Lejárati dátum (opcionális)</span>
            <input
              type="date"
              value={lejarat}
              onChange={(e) => setLejarat(e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={damaged}
                onChange={(e) => setDamaged(e.target.checked)}
                className="h-4 w-4"
              />
              Sérülten érkezett (selejt)
            </label>
            {damaged && (
              <select
                value={selejtOk}
                onChange={(e) => setSelejtOk(e.target.value)}
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

      {/* 4. lépés - szállítólevél fotó */}
      {step === 4 && mode === 'single' && unit && (
        <div className="flex flex-col gap-4">
          <StepTitle
            title="Szállítólevél fotó"
            hint="Készíts fotót a szállítólevélről (opcionális), vagy mentsd fotó nélkül."
          />
          <label className="cursor-pointer rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
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
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              Fotó eltávolítása
            </button>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {/* ===== TÖBB TÉTEL mód ===== */}
      {step === 2 && mode === 'multi' && (
        <div className="flex flex-col gap-3">
          <StepTitle
            title="Tételek szkennelése"
            hint="Olvasd be egymás után a termékeket (ugyanaz újra = +1), vagy keresd ki kézzel. A végén egy bizonylatba bevételezed."
          />
          <div className="flex gap-2">
            <input
              value={multiQuery}
              onChange={(e) => setMultiQuery(e.target.value)}
              placeholder="Keresés kézi hozzáadáshoz…"
              className={inputCls}
            />
            <ScanButton
              title="Termék vonalkód"
              onScan={(text) => {
                const hit = catalog.find((c) => c.vonalkod && c.vonalkod === text.trim())
                if (hit) addLine(hit)
                else setError(`Nincs ilyen vonalkódú termék: ${text}`)
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Kézi kereső találatok */}
          {multiQuery.trim() && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
              {multiFiltered.slice(0, 8).map((c) => (
                <button
                  key={c.unit_id}
                  type="button"
                  onClick={() => {
                    addLine(c)
                    setMultiQuery('')
                  }}
                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  <span className="truncate font-medium text-slate-800">{c.product_nev}</span>
                  <span className="shrink-0 text-xs text-slate-400">+ {kisz(c.kiszereles)}</span>
                </button>
              ))}
              {multiFiltered.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-slate-400">Nincs találat.</p>
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
                    key={l.unit.unit_id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        {l.unit.product_nev}
                      </p>
                      <p className="text-xs text-slate-400">
                        {kisz(l.unit.kiszereles)} ·{' '}
                        {l.qty * l.unit.mennyiseg_alapegysegben} db
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Csökkentés"
                        onClick={() => setLineQty(l.unit.unit_id, l.qty - 1)}
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
                        onClick={() => setLineQty(l.unit.unit_id, l.qty + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-lg font-semibold text-slate-600 active:bg-slate-100"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label="Törlés"
                        onClick={() => removeLine(l.unit.unit_id)}
                        className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
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
