'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { ScrapDialog } from '@/components/wizard/ScrapDialog'
import { StepTitle, SelectRow, QtyStepper, DoneSummary } from '@/components/wizard/parts'
import { kigyujtAction, selejtKigyujtesAction } from '@/app/(admin)/kigyujtes/actions'
import type { BetaroltItem } from './page'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k

type Done = { kind: 'kigyujt' | 'selejt'; lines: string[] }

export function OsszekeszitesWizard({ items }: { items: BetaroltItem[] }) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [item, setItem] = useState<BetaroltItem | null>(null)
  const [locConfirmed, setLocConfirmed] = useState(false)
  const [qty, setQty] = useState(1)
  const [query, setQuery] = useState('')
  const [scrapOpen, setScrapOpen] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setItem(null)
    setLocConfirmed(false)
    setQty(1)
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

  function pickItem(it: BetaroltItem) {
    setItem(it)
    setQty(it.mennyiseg)
    setLocConfirmed(false)
    setError(null)
    setStep(2)
  }

  async function submit() {
    if (!item) return
    setError(null)
    setSubmitting(true)
    const res = await kigyujtAction({ stock_item_id: item.id, mennyiseg: qty })
    setSubmitting(false)
    if (res.error) return setError(res.error)
    setDone({
      kind: 'kigyujt',
      lines: [
        `Termék: ${item.product_nev}`,
        `Mennyiség: ${qty} db`,
        `Tárhely: ${item.teljes_kod ?? '-'}`,
      ],
    })
  }

  // ---- Záró összegzés ----
  if (done) {
    const isScrap = done.kind === 'selejt'
    return (
      <WizardShell
        title={isScrap ? 'Selejtezve' : 'Összekészítve'}
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {!isScrap && (
              <Link
                href="/munka/kiszallitas"
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
              >
                Tovább a kiszállításra
              </Link>
            )}
            <button
              type="button"
              onClick={reset}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold ${
                isScrap
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Új összekészítés indítása
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
        <DoneSummary
          title={isScrap ? 'Selejtezés rögzítve' : 'Sikeres összekészítés'}
          lines={done.lines}
        />
      </WizardShell>
    )
  }

  // ---- Nincs betárolt tétel ----
  if (items.length === 0) {
    return (
      <WizardShell
        title="Összekészítés"
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
          Nincs betárolt tétel összekészítéshez.
        </div>
      </WizardShell>
    )
  }

  const nextForStep =
    step === 2
      ? () => setStep(3)
      : step === 3
        ? submitting
          ? undefined
          : submit
        : undefined // 1. lépésen kiválasztással lépünk tovább

  return (
    <>
      <WizardShell
        title="Összekészítés"
        onCancel={cancel}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onScrap={item ? () => setScrapOpen(true) : undefined}
        onNext={nextForStep}
        nextLabel={step === 3 ? (submitting ? 'Mentés…' : 'Összekészítés') : 'Tovább'}
      >
        {/* 1. lépés - tétel (FEFO ajánlással) */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Termék kiválasztása"
              hint="A legkorábbi lejáratú (FEFO) tétel ajánlott. Koppints vagy olvasd be a vonalkódot."
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
                  else setError(`Nincs ilyen vonalkódú betárolt tétel: ${text}`)
                }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {filtered.map((it) => (
                <SelectRow key={it.id} onClick={() => pickItem(it)}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      {it.product_nev}
                      {it.fefo && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          FEFO
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {it.mennyiseg} db
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {kisz(it.kiszereles)}
                    {it.teljes_kod ? ` · hely: ${it.teljes_kod}` : ''}
                    {it.lejarat_datum ? ` · lej.: ${it.lejarat_datum}` : ''}
                  </p>
                </SelectRow>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">Nincs találat.</p>
              )}
            </div>
          </div>
        )}

        {/* 2. lépés - tárhely megerősítése */}
        {step === 2 && item && (
          <div className="flex flex-1 flex-col">
            <StepTitle
              title="Tárhely megerősítése"
              hint="Ellenőrizd, hogy a jó polcról gyűjtesz. Beolvashatod a QR-t, vagy továbbléphetsz."
            />
            <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
              <div>
                <p className="text-sm text-slate-500">Elvárt tárhely</p>
                <p className="mt-1 font-mono text-2xl font-bold text-slate-900">
                  {item.teljes_kod ?? '-'}
                </p>
              </div>
              {locConfirmed ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>
                  Tárhely megerősítve
                </p>
              ) : (
                <ScanButton
                  title="Tárhely QR"
                  onScan={(text) => {
                    if (item.teljes_kod && text.trim() === item.teljes_kod) {
                      setLocConfirmed(true)
                      setError(null)
                    } else {
                      setError(`Ez nem a várt tárhely (${item.teljes_kod ?? '-'}): ${text}`)
                    }
                  }}
                />
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
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
      </WizardShell>

      {scrapOpen && item && (
        <ScrapDialog
          productName={item.product_nev}
          maxQty={item.mennyiseg}
          onClose={() => setScrapOpen(false)}
          onSubmit={(a) =>
            selejtKigyujtesAction({
              stock_item_id: item.id,
              mennyiseg: a.mennyiseg,
              selejt_ok: a.selejt_ok,
              megjegyzes: a.megjegyzes,
            })
          }
          onSuccess={(lines) => {
            setScrapOpen(false)
            setDone({ kind: 'selejt', lines })
          }}
        />
      )}
    </>
  )
}
