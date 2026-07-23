'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import type { Supplier } from '@/lib/suppliers'
import type { SupplierFormState } from './actions'

type Action = (
  prev: SupplierFormState,
  formData: FormData
) => Promise<SupplierFormState>

export function SupplierForm({
  action,
  initial,
  submitLabel,
}: {
  action: Action
  initial?: Supplier
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<
    SupplierFormState,
    FormData
  >(action, {})

  const input =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
  const label = 'flex flex-col gap-1 text-sm font-medium text-slate-700'

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className={label}>
        Név *
        <input name="nev" defaultValue={initial?.nev ?? ''} required className={input} />
      </label>
      <label className={label}>
        Adószám
        <input name="adoszam" defaultValue={initial?.adoszam ?? ''} className={input} />
      </label>
      <label className={label}>
        Cím
        <input name="cim" defaultValue={initial?.cim ?? ''} className={input} />
      </label>
      <label className={label}>
        Kapcsolattartó
        <input
          name="kapcsolattarto"
          defaultValue={initial?.kapcsolattarto ?? ''}
          className={input}
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : submitLabel}
        </button>
        <Link
          href="/beszallitok"
          className="rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Mégse
        </Link>
      </div>
    </form>
  )
}
