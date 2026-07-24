'use client'

import type { ReactNode } from 'react'

/** Lépés fejléce: nagy cím + opcionális segédszöveg. */
export function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

/** Nagy, koppintható lista-sor (tétel/opció kiválasztásához). */
export function SelectRow({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition active:scale-[0.99] ${
        active
          ? 'border-slate-900 bg-slate-900/[0.03] ring-1 ring-slate-900'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

/** Nagy mennyiség-léptető: −  [érték]  +, nagy érintési felülettel. */
export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  unit = 'db',
}: {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
  unit?: string
}) {
  const clamp = (n: number) =>
    Math.max(min, max != null ? Math.min(max, n) : n)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Csökkentés"
          onClick={() => onChange(clamp(value - 1))}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 text-2xl font-semibold text-slate-700 active:bg-slate-100"
        >
          −
        </button>
        <input
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            onChange(Number.isNaN(n) ? min : clamp(n))
          }}
          inputMode="numeric"
          className="w-28 rounded-xl border border-slate-300 py-3 text-center text-3xl font-bold text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          aria-label="Növelés"
          onClick={() => onChange(clamp(value + 1))}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 text-2xl font-semibold text-slate-700 active:bg-slate-100"
        >
          +
        </button>
      </div>
      <span className="text-sm text-slate-500">
        {unit}
        {max != null ? ` · elérhető: ${max}` : ''}
      </span>
    </div>
  )
}

/** Záró összegzés lépés törzse. */
export function DoneSummary({
  title,
  lines,
}: {
  title: string
  lines: string[]
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-11" />
        </svg>
      </span>
      <h2 className="mt-4 text-xl font-semibold text-slate-900">{title}</h2>
      <div className="mt-4 w-full max-w-xs rounded-xl border border-slate-200 bg-white p-4 text-left">
        <ul className="flex flex-col gap-1.5 text-sm text-slate-700">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
