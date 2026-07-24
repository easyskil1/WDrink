'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { ScanButton } from '@/components/ScanButton'
import { WizardShell } from '@/components/wizard/WizardShell'
import { ScrapDialog } from '@/components/wizard/ScrapDialog'
import { StepTitle, SelectRow, QtyStepper, DoneSummary } from '@/components/wizard/parts'
import { atrarolAction } from '@/app/(admin)/atrarolas/actions'
import { selejtOnalloAction } from '@/app/(admin)/selejtezes/actions'
import type { BetaroltItem, LocationOption } from './page'

const kisz = (k: string) => KISZERELES_LABEL[k as KiszerelesTipus] ?? k

type Done = { kind: 'atrarol' | 'selejt'; lines: string[] }

export function AtrarolasWizard({
  items,
  locations,
}: {
  items: BetaroltItem[]
  locations: LocationOption[]
}) {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [source, setSource] = useState<{ id: string; teljes_kod: string } | null>(null)
  const [item, setItem] = useState<BetaroltItem | null>(null)
  const [qty, setQty] = useState(1)
  const [dest, setDest] = useState<LocationOption | null>(null)
  const [scrapOpen, setScrapOpen] = useState(false)
  const [done, setDone] = useState<Done | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = () => router.push('/')

  function reset() {
    setStep(1)
    setSource(null)
    setItem(null)
    setQty(1)
    setDest(null)
    setDone(null)
    setError(null)
    router.refresh()
  }

  // Forrás tárhelyek: azok az aktív helyek, ahol van betárolt tétel.
  const sourceLocations = useMemo(() => {
    const map = new Map<string, string>()
    for (const it of items) {
      if (it.location_id && it.teljes_kod) map.set(it.location_id, it.teljes_kod)
    }
    return [...map.entries()]
      .map(([id, teljes_kod]) => ({ id, teljes_kod }))
      .sort((a, b) => a.teljes_kod.localeCompare(b.teljes_kod))
  }, [items])

  const itemsAtSource = useMemo(
    () => (source ? items.filter((i) => i.location_id === source.id) : []),
    [items, source]
  )

  function pickSource(loc: { id: string; teljes_kod: string }) {
    setSource(loc)
    setItem(null)
    setError(null)
    setStep(2)
  }

  function pickItem(it: BetaroltItem) {
    setItem(it)
    setQty(it.mennyiseg)
    setError(null)
    setStep(3)
  }

  async function submit() {
    if (!item || !dest) return
    if (dest.id === source?.id) return setError('A cél nem lehet a forrás tárhely.')
    setError(null)
    setSubmitting(true)
    const res = await atrarolAction({
      stock_item_id: item.id,
      cel_location_id: dest.id,
      mennyiseg: qty,
    })
    setSubmitting(false)
    if (res.error) return setError(res.error)
    setDone({
      kind: 'atrarol',
      lines: [
        `Termék: ${item.product_nev}`,
        `Mennyiség: ${qty} db`,
        `Forrás: ${source?.teljes_kod ?? '—'}`,
        `Cél: ${dest.teljes_kod}`,
      ],
    })
  }

  // ---- Záró összegzés ----
  if (done) {
    const isScrap = done.kind === 'selejt'
    return (
      <WizardShell
        title={isScrap ? 'Selejtezve' : 'Átrárolva'}
        onCancel={cancel}
        footer={
          <div className="mx-auto flex max-w-md flex-col gap-2">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Új átrárolás indítása
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
          title={isScrap ? 'Selejtezés rögzítve' : 'Sikeres átrárolás'}
          lines={done.lines}
        />
      </WizardShell>
    )
  }

  // ---- Nincs betárolt tétel ----
  if (items.length === 0) {
    return (
      <WizardShell
        title="Átrárolás"
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
          Nincs betárolt (polcon lévő) tétel átrároláshoz.
        </div>
      </WizardShell>
    )
  }

  const nextForStep =
    step === 3
      ? () => setStep(4)
      : step === 4
        ? dest && !submitting
          ? submit
          : undefined
        : undefined // 1–2 lépésen kiválasztással lépünk tovább

  return (
    <>
      <WizardShell
        title="Átrárolás"
        onCancel={cancel}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onScrap={item ? () => setScrapOpen(true) : undefined}
        onNext={nextForStep}
        nextLabel={step === 4 ? (submitting ? 'Mentés…' : 'Átrárolás') : 'Tovább'}
      >
        {/* 1. lépés – forrás tárhely */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Forrás tárhely"
              hint="Olvasd be, honnan viszed el a terméket."
            />
            <div className="flex justify-end">
              <ScanButton
                title="Forrás tárhely QR"
                onScan={(text) => {
                  const loc = sourceLocations.find((l) => l.teljes_kod === text.trim())
                  if (loc) pickSource(loc)
                  else setError(`Nincs betárolt tétel ezen a helyen: ${text}`)
                }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {sourceLocations.map((l) => (
                <SelectRow key={l.id} onClick={() => pickSource(l)}>
                  <span className="font-mono text-slate-900">{l.teljes_kod}</span>
                </SelectRow>
              ))}
            </div>
          </div>
        )}

        {/* 2. lépés – termék a forrás helyen */}
        {step === 2 && source && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Termék kiválasztása"
              hint={`Forrás: ${source.teljes_kod}. Koppints vagy olvasd be a vonalkódot.`}
            />
            <div className="flex justify-end">
              <ScanButton
                title="Termék vonalkód"
                onScan={(text) => {
                  const hit = itemsAtSource.find((i) => i.vonalkod && i.vonalkod === text.trim())
                  if (hit) pickItem(hit)
                  else setError(`Nincs ilyen vonalkódú tétel ezen a helyen: ${text}`)
                }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {itemsAtSource.map((it) => (
                <SelectRow key={it.id} onClick={() => pickItem(it)}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-slate-900">{it.product_nev}</span>
                    <span className="shrink-0 text-sm font-semibold text-slate-700">
                      {it.mennyiseg} db
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {kisz(it.kiszereles)}
                    {it.lot_szam ? ` · LOT: ${it.lot_szam}` : ''}
                  </p>
                </SelectRow>
              ))}
            </div>
          </div>
        )}

        {/* 3. lépés – mennyiség */}
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

        {/* 4. lépés – cél tárhely */}
        {step === 4 && item && (
          <div className="flex flex-col gap-3">
            <StepTitle
              title="Cél tárhely"
              hint="Hová kerüljön a termék."
            />
            <div className="flex justify-end">
              <ScanButton
                title="Cél tárhely QR"
                onScan={(text) => {
                  const loc = locations.find((l) => l.teljes_kod === text.trim())
                  if (!loc) return setError(`Nincs ilyen tárhely: ${text}`)
                  if (loc.id === source?.id) return setError('A cél nem lehet a forrás.')
                  setDest(loc)
                  setError(null)
                }}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col gap-2">
              {locations
                .filter((l) => l.id !== source?.id)
                .map((l) => (
                  <SelectRow
                    key={l.id}
                    active={dest?.id === l.id}
                    onClick={() => {
                      setDest(l)
                      setError(null)
                    }}
                  >
                    <span className="font-mono text-slate-900">{l.teljes_kod}</span>
                  </SelectRow>
                ))}
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
            selejtOnalloAction({
              stock_item_id: item.id,
              mennyiseg: a.mennyiseg,
              selejt_ok: a.selejt_ok,
              megjegyzes: a.megjegyzes,
              dokumentum_url: null,
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
