'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { WizardShell } from '@/components/wizard/WizardShell'
import { StepTitle, SelectRow } from '@/components/wizard/parts'
import { kiadAction } from '@/app/(admin)/kiadas/actions'
import type { PickedItem } from './page'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k
const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

type Done = { noteId: string; lines: string[] }

export function KiszallitasWizard({
  items,
  defaultDatum,
}: {
  items: PickedItem[]
  defaultDatum: string
}) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [vevo, setVevo] = useState('')
  const [datum, setDatum] = useState(defaultDatum)
  const [done, setDone] = useState<Done | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setSelected(new Set())
    setVevo('')
    setDatum(defaultDatum)
    setDone(null)
    setError(null)
    router.refresh()
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected]
  )

  async function submit() {
    if (selectedItems.length === 0 || !vevo.trim()) return
    setError(null)
    setSubmitting(true)
    const res = await kiadAction({
      vevo_nev: vevo,
      datum: datum || null,
      stock_item_ids: selectedItems.map((i) => i.id),
    })
    setSubmitting(false)
    if (res.error) return setError(res.error)
    setDone({
      noteId: res.noteId ?? '',
      lines: [
        `Vevő: ${vevo.trim()}`,
        `Dátum: ${datum || '-'}`,
        `Tételek: ${selectedItems.length} db`,
      ],
    })
  }

  // ---- Záró összegzés ----
  if (done) {
    return (
      <WizardShell
        title="Kiszállítva"
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {done.noteId && (
              <Link
                href={`/kiadas/${done.noteId}/szallitolevel`}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                Szállítólevél megnyitása
              </Link>
            )}
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Új kiszállítás indítása
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
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>
          </span>
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Kiadás rögzítve
          </h2>
          <div className="mt-4 w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 text-left">
            <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
              {done.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </WizardShell>
    )
  }

  // ---- Nincs kigyűjtött tétel ----
  if (items.length === 0) {
    return (
      <WizardShell
        title="Kiszállítás"
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
          Nincs kigyűjtött tétel kiszállításra. Előbb készíts össze tételeket.
        </div>
      </WizardShell>
    )
  }

  return (
    <WizardShell
      title="Kiszállítás"
      onCancel={cancel}
      onBack={step > 1 ? () => setStep(step - 1) : undefined}
      onNext={
        step === 1
          ? selected.size > 0
            ? () => setStep(2)
            : undefined
          : vevo.trim() && !submitting
            ? submit
            : undefined
      }
      nextLabel={step === 2 ? (submitting ? 'Mentés…' : 'Kiadás rögzítése') : 'Tovább'}
    >
      {/* 1. lépés - gyűjtött tételek áttekintése */}
      {step === 1 && (
        <div className="flex flex-col gap-3">
          <StepTitle
            title="Gyűjtött tételek"
            hint="Jelöld ki, mi kerüljön a szállítólevélre."
          />
          <div className="flex flex-col gap-2">
            {items.map((it) => {
              const on = selected.has(it.id)
              return (
                <SelectRow key={it.id} active={on} onClick={() => toggle(it.id)}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        on
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {on && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium text-slate-900">
                          {it.product_nev}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-slate-700">
                          {it.mennyiseg} db
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {kisz(it.kiszereles)}
                        {it.lot_szam ? ` · LOT: ${it.lot_szam}` : ''}
                      </p>
                    </div>
                  </div>
                </SelectRow>
              )
            })}
          </div>
        </div>
      )}

      {/* 2. lépés - megerősítés (vevő + dátum) */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          <StepTitle
            title="Megerősítés"
            hint={`${selectedItems.length} tétel kerül a szállítólevélre.`}
          />
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Vevő neve</span>
            <input
              value={vevo}
              onChange={(e) => setVevo(e.target.value)}
              placeholder="Vevő megnevezése"
              className={inputCls}
            />
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

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kiszállítandó tételek
            </p>
            <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
              {selectedItems.map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="truncate">{it.product_nev}</span>
                  <span className="shrink-0 font-medium">{it.mennyiseg} db</span>
                </li>
              ))}
            </ul>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </WizardShell>
  )
}
