'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { ScrapDialog } from '@/components/wizard/ScrapDialog'
import { StepTitle, SelectRow, QtyStepper, DoneSummary } from '@/components/wizard/parts'
import { betarolAction, selejtBetarolasAction } from '@/app/(admin)/betarolas/actions'
import type { LocationOption, PufferItem } from './page'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k

type Done = { kind: 'betarol' | 'selejt'; lines: string[] }

export function BetarolasWizard({
  items,
  locations,
}: {
  items: PufferItem[]
  locations: LocationOption[]
}) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [item, setItem] = useState<PufferItem | null>(null)
  const [qty, setQty] = useState(1)
  const [location, setLocation] = useState<LocationOption | null>(null)
  const [query, setQuery] = useState('')
  const [scrapOpen, setScrapOpen] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setItem(null)
    setQty(1)
    setLocation(null)
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

  function pickItem(it: PufferItem) {
    setItem(it)
    setQty(it.mennyiseg)
    setError(null)
    setStep(2)
  }

  function handleScan(text: string) {
    const t = text.trim()
    const hit = items.find((i) => i.vonalkod && i.vonalkod === t)
    if (hit) pickItem(hit)
    else setError(`Nincs pufferben ilyen vonalkódú tétel: ${t}`)
  }

  async function submit() {
    if (!item || !location) return
    setError(null)
    setSubmitting(true)
    const res = await betarolAction({
      stock_item_id: item.id,
      location_id: location.id,
      mennyiseg: qty,
    })
    setSubmitting(false)
    if (res.error) return setError(res.error)
    setDone({
      kind: 'betarol',
      lines: [
        `Termék: ${item.product_nev}`,
        `Mennyiség: ${qty} db`,
        `Tárhely: ${location.teljes_kod}`,
      ],
    })
  }

  // ---- Záró összegzés ----
  if (done) {
    const isScrap = done.kind === 'selejt'
    return (
      <WizardShell
        title={isScrap ? 'Selejtezve' : 'Betárolva'}
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Új betárolás indítása
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
        <DoneSummary
          title={isScrap ? 'Selejtezés rögzítve' : 'Sikeres betárolás'}
          lines={done.lines}
        />
      </WizardShell>
    )
  }

  // ---- Üres puffer ----
  if (items.length === 0) {
    return (
      <WizardShell
        title="Betárolás"
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
          Nincs pufferben lévő tétel. Előbb bevételezz.
        </div>
      </WizardShell>
    )
  }

  const scrapAction = item
    ? () => setScrapOpen(true)
    : undefined

  return (
    <>
      <WizardShell
        title="Betárolás"
        onCancel={cancel}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onScrap={scrapAction}
        onNext={
          step === 1
            ? undefined // 1. lépésen tétel kiválasztással lépünk tovább
            : step === 2
              ? () => setStep(3)
              : location && !submitting
                ? submit
                : undefined
        }
        nextLabel={step === 3 ? (submitting ? 'Mentés…' : 'Betárolás') : 'Tovább'}
      >
        {/* 1. lépés – puffer tétel */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Puffer tétel kiválasztása"
              hint="Koppints a tételre, vagy olvasd be a termék vonalkódját."
            />
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keresés név / LOT szerint…"
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
              <ScanButton title="Termék vonalkód" onScan={handleScan} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {filtered.map((it) => (
                <SelectRow key={it.id} onClick={() => pickItem(it)}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">
                      {it.product_nev}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {it.mennyiseg} db
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {kisz(it.kiszereles)}
                    {it.lot_szam ? ` · LOT: ${it.lot_szam}` : ''}
                    {it.lejarat_datum ? ` · lej.: ${it.lejarat_datum}` : ''}
                  </p>
                </SelectRow>
              ))}
              {filtered.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nincs találat.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 2. lépés – mennyiség */}
        {step === 2 && item && (
          <div className="flex flex-1 flex-col">
            <StepTitle
              title="Mennyiség megerősítése"
              hint={`${item.product_nev} · ${kisz(item.kiszereles)}`}
            />
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <QtyStepper value={qty} onChange={setQty} min={1} max={item.mennyiseg} />
            </div>
          </div>
        )}

        {/* 3. lépés – tárhely */}
        {step === 3 && item && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Cél tárhely"
              hint="Olvasd be a tárhely QR kódját, vagy válaszd a listából."
            />
            <div className="flex justify-end">
              <ScanButton
                title="Tárhely QR"
                onScan={(text) => {
                  const loc = locations.find((l) => l.teljes_kod === text.trim())
                  if (loc) {
                    setLocation(loc)
                    setError(null)
                  } else setError(`Nincs ilyen tárhely: ${text}`)
                }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {locations.map((l) => (
                <SelectRow
                  key={l.id}
                  active={location?.id === l.id}
                  onClick={() => {
                    setLocation(l)
                    setError(null)
                  }}
                >
                  <span className="font-mono text-slate-900">{l.teljes_kod}</span>
                </SelectRow>
              ))}
              {locations.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nincs aktív tárhely.
                </p>
              )}
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
            selejtBetarolasAction({
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
