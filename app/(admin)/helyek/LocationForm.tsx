'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  LOCATION_TIPUS_OPTIONS,
  computeTeljesKod,
  type Location,
} from '@/lib/locations'
import type { LocationFormState } from './actions'

type Action = (
  prev: LocationFormState,
  formData: FormData
) => Promise<LocationFormState>

export function LocationForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action
  initial?: Location
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<
    LocationFormState,
    FormData
  >(action, {})

  const [parts, setParts] = useState({
    sor: initial?.sor ?? '',
    polc: initial?.polc ?? '',
    polcsor: initial?.polcsor ?? '',
    tarhely: initial?.tarhely ?? '',
  })

  const preview = computeTeljesKod(parts)

  const input =
    'rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
  const label = 'flex flex-col gap-1 text-sm font-medium text-slate-700'

  return (
    <form action={formAction} className="max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        {(['sor', 'polc', 'polcsor', 'tarhely'] as const).map((field) => (
          <label key={field} className={label}>
            {field[0].toUpperCase() + field.slice(1)}
            <input
              name={field}
              value={parts[field]}
              onChange={(e) =>
                setParts((p) => ({ ...p, [field]: e.target.value }))
              }
              required
              className={input}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
        Teljes kód:{' '}
        <span className="font-mono font-semibold text-slate-900">
          {preview || '—'}
        </span>
      </div>

      <label className={`${label} mt-4`}>
        Típus
        <select
          name="tipus"
          defaultValue={initial?.tipus ?? 'raktar'}
          className={input}
        >
          {LOCATION_TIPUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="aktiv"
          defaultChecked={initial?.aktiv ?? true}
          className="h-4 w-4"
        />
        Aktív
      </label>

      {state.error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : submitLabel}
        </button>
        <Link
          href="/helyek"
          className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Mégse
        </Link>
      </div>
    </form>
  )
}
