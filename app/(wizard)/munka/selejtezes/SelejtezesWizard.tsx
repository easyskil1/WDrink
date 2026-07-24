'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { SELEJT_OK_OPTIONS } from '@/lib/stock'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { StepTitle, SelectRow, QtyStepper, DoneSummary } from '@/components/wizard/parts'
import { selejtOnalloAction } from '@/app/(admin)/selejtezes/actions'
import type { OnHandItem } from './page'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k

export function SelejtezesWizard({ items }: { items: OnHandItem[] }) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [item, setItem] = useState<OnHandItem | null>(null)
  const [qty, setQty] = useState(1)
  const [selejtOk, setSelejtOk] = useState<string | null>(null)
  const [megjegyzes, setMegjegyzes] = useState('')
  const [query, setQuery] = useState('')
  const [done, setDone] = useState<string[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setItem(null)
    setQty(1)
    setSelejtOk(null)
    setMegjegyzes('')
    setQuery('')
    setDone(null)
    setError(null)
    router.refresh()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (i) =>
        i.product_nev.toLowerCase().includes(q) ||
        (i.lot_szam ?? '').toLowerCase().includes(q) ||
        (i.vonalkod ?? '').includes(q)
    )
  }, [items, query])

  function pickItem(it: OnHandItem) {
    setItem(it)
    setQty(it.mennyiseg)
    setError(null)
    setStep(2)
  }

  async function submit() {
    if (!item || !selejtOk) return
    setError(null)
    setSubmitting(true)
    const res = await selejtOnalloAction({
      stock_item_id: item.id,
      mennyiseg: qty,
      selejt_ok: selejtOk,
      megjegyzes: megjegyzes.trim() || null,
      dokumentum_url: null,
    })
    setSubmitting(false)
    if (res.error) return setError(res.error)
    const okLabel = SELEJT_OK_OPTIONS.find((o) => o.value === selejtOk)?.label ?? selejtOk
    setDone([
      `Termék: ${item.product_nev}`,
      `Mennyiség: ${qty} db`,
      `Indok: ${okLabel}`,
      ...(megjegyzes.trim() ? [`Megjegyzés: ${megjegyzes.trim()}`] : []),
    ])
  }

  // ---- Záró összegzés ----
  if (done) {
    return (
      <WizardShell
        title="Selejtezve"
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Új selejtezés indítása
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
        <DoneSummary title="Selejtezés rögzítve" lines={done} />
      </WizardShell>
    )
  }

  // ---- Nincs készleten tétel ----
  if (items.length === 0) {
    return (
      <WizardShell
        title="Selejtezés"
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
          Nincs készleten lévő tétel selejtezéshez.
        </div>
      </WizardShell>
    )
  }

  const nextForStep =
    step === 2
      ? () => setStep(3)
      : step === 3
        ? () => setStep(4)
        : step === 4
          ? selejtOk && !submitting
            ? submit
            : undefined
          : undefined // 1. lépésen kiválasztással lépünk tovább

  return (
    <WizardShell
      title="Selejtezés"
      onCancel={cancel}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={nextForStep}
      nextLabel={step === 4 ? (submitting ? 'Mentés…' : 'Selejtezés') : step === 2 ? 'Tovább' : 'Tovább'}
    >
      {/* 1. lépés - termék */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <StepTitle
            title="Termék kiválasztása"
            hint="Koppints a tételre, vagy olvasd be a vonalkódot."
          />
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Keresés név / LOT szerint…"
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <ScanButton
              title="Termék vonalkód"
              onScan={(text) => {
                const hit = items.find((i) => i.vonalkod && i.vonalkod === text.trim())
                if (hit) pickItem(hit)
                else setError(`Nincs ilyen vonalkódú készleten lévő tétel: ${text}`)
              }}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-col gap-2">
            {filtered.map((it) => (
              <SelectRow key={it.id} onClick={() => pickItem(it)}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-slate-900">{it.product_nev}</span>
                  <span className="shrink-0 text-sm font-semibold text-slate-700">
                    {it.mennyiseg} db
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {kisz(it.kiszereles)} · {it.statusz_label}
                  {it.teljes_kod ? ` · ${it.teljes_kod}` : ''}
                  {it.lot_szam ? ` · LOT: ${it.lot_szam}` : ''}
                </p>
              </SelectRow>
            ))}
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-400">Nincs találat.</p>
            )}
          </div>
        </div>
      )}

      {/* 2. lépés - tárhely (kihagyható) */}
      {step === 2 && item && (
        <div className="flex flex-1 flex-col">
          <StepTitle
            title="Tárhely (opcionális)"
            hint="Megerősítheted a tárhelyet, vagy kihagyhatod ezt a lépést."
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
            <div>
              <p className="text-sm text-slate-500">Tárhely</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
                {item.teljes_kod ?? 'Puffer (nincs tárhely)'}
              </p>
            </div>
            {item.teljes_kod && (
              <ScanButton
                title="Tárhely QR"
                onScan={(text) => {
                  if (text.trim() === item.teljes_kod) {
                    setError(null)
                    setStep(3)
                  } else setError(`Ez nem a tétel tárhelye (${item.teljes_kod}): ${text}`)
                }}
              />
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={() => {
                setError(null)
                setStep(3)
              }}
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              Kihagyom ezt a lépést
            </button>
          </div>
        </div>
      )}

      {/* 3. lépés - mennyiség */}
      {step === 3 && item && (
        <div className="flex flex-1 flex-col">
          <StepTitle
            title="Mennyiség"
            hint={`${item.product_nev} · ${kisz(item.kiszereles)}`}
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <QtyStepper value={qty} onChange={setQty} min={1} max={item.mennyiseg} />
          </div>
        </div>
      )}

      {/* 4. lépés - indok */}
      {step === 4 && item && (
        <div className="flex flex-col gap-3">
          <StepTitle title="Selejtezés indoka" hint="Kötelező megadni." />
          <div className="flex flex-col gap-2">
            {SELEJT_OK_OPTIONS.map((o) => (
              <SelectRow
                key={o.value}
                active={selejtOk === o.value}
                onClick={() => setSelejtOk(o.value)}
              >
                <span className="font-medium text-slate-900">{o.label}</span>
              </SelectRow>
            ))}
          </div>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">
              Megjegyzés (opcionális)
            </span>
            <input
              value={megjegyzes}
              onChange={(e) => setMegjegyzes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </WizardShell>
  )
}
