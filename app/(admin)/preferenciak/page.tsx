'use client'

import { useEffect, useState } from 'react'
import {
  getContinuousScan,
  setContinuousScan,
  getKeszletLimit,
  setKeszletLimit,
  DEFAULT_KESZLET_LISTA_LIMIT,
  KESZLET_LIMIT_MIN,
  KESZLET_LIMIT_MAX,
} from '@/lib/deviceSettings'

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
        checked ? 'bg-slate-900' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function PreferenciakPage() {
  const [continuous, setContinuous] = useState(false)
  const [limit, setLimit] = useState(DEFAULT_KESZLET_LISTA_LIMIT)
  const [savedLimit, setSavedLimit] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // queueMicrotask: ne szinkron setState történjen az effekt törzsében.
    queueMicrotask(() => {
      setContinuous(getContinuousScan())
      setLimit(getKeszletLimit())
      setLoaded(true)
    })
  }, [])

  function updateContinuous(v: boolean) {
    setContinuous(v)
    setContinuousScan(v)
  }

  function saveLimit() {
    setKeszletLimit(limit)
    setLimit(getKeszletLimit()) // visszaolvasás a beszorított értékkel
    setSavedLimit(true)
    setTimeout(() => setSavedLimit(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Beállítások</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ezek a beállítások ehhez a készülékhez tartoznak (nem a fiókhoz).
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <p className="font-medium text-slate-900">Folyamatos szkennelés</p>
            <p className="mt-1 text-sm text-slate-500">
              A több-tételes bevételezésnél a kamera nyitva marad, és egymás után
              olvashatod a vonalkódokat. Ugyanaz a kód rövid ideig nem duplázódik.
              Kikapcsolva minden beolvasás után be kell zárni és újranyitni a
              kamerát.
            </p>
          </div>
          {loaded && (
            <Toggle checked={continuous} onChange={updateContinuous} />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="font-medium text-slate-900">
            Készletlisták max. megjelenített tétel
          </p>
          <p className="mt-1 text-sm text-slate-500">
            A munkalisták (betárolás, kigyűjtés, kiszállítás, átrárolás,
            selejtezés) legfeljebb ennyi tételt töltenek be a gyorsaság
            érdekében. Ha egy lista eléri ezt a számot, figyelmeztetést mutat.
            Nagyobb szám = több egyszerre látható tétel, de lassabb betöltés.
          </p>
          {loaded && (
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={KESZLET_LIMIT_MIN}
                max={KESZLET_LIMIT_MAX}
                step={50}
                value={limit}
                onChange={(e) =>
                  setLimit(Number.parseInt(e.target.value, 10) || 0)
                }
                className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={saveLimit}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Mentés
              </button>
              {savedLimit && (
                <span className="text-sm text-green-600">Mentve.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
