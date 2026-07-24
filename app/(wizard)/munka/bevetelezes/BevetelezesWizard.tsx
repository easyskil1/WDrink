'use client'

import { useMemo, useState } from 'react'
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
  const [supplierId, setSupplierId] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [unit, setUnit] = useState<UnitCatalogItem | null>(null)
  const [mennyiseg, setMennyiseg] = useState(1)
  const [lot, setLot] = useState('')
  const [lejarat, setLejarat] = useState('')
  const [damaged, setDamaged] = useState(false)
  const [selejtOk, setSelejtOk] = useState('serult')
  const [file, setFile] = useState<File | null>(null)
  const [query, setQuery] = useState('')
  const [done, setDone] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
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

  function pickUnit(u: UnitCatalogItem) {
    setUnit(u)
    setMennyiseg(1)
    setError(null)
    setStep(3)
  }

  async function submit() {
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
              onClick={reset}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Új bevételezés indítása
            </button>
            <button
              type="button"
              onClick={cancel}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
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

  const nextForStep =
    step === 1
      ? () => setStep(2)
      : step === 2
        ? undefined // termék kiválasztással lépünk tovább
        : step === 3
          ? mennyiseg > 0
            ? () => setStep(4)
            : undefined
          : step === 4
            ? submitting
              ? undefined
              : submit
            : undefined

  return (
    <WizardShell
      title="Bevételezés"
      onCancel={cancel}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={nextForStep}
      nextLabel={step === 4 ? (submitting ? 'Mentés…' : 'Bevételezés') : 'Tovább'}
    >
      {/* 1. lépés - beszállító + dátum */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <StepTitle
            title="Beszállító"
            hint="Válaszd ki a beszállítót (opcionális) és a bevétel dátumát."
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
        </div>
      )}

      {/* 2. lépés - termék */}
      {step === 2 && (
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
                  <span className="shrink-0 text-xs text-slate-400">
                    {kisz(c.kiszereles)}
                  </span>
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
      {step === 3 && unit && (
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
            = <span className="font-semibold text-slate-800">
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
      {step === 4 && unit && (
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
    </WizardShell>
  )
}
