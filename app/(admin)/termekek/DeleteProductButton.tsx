'use client'

import { useState, useTransition } from 'react'
import { deleteProduct } from './actions'

export function DeleteProductButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function doDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteProduct(id)
      if (!res.ok) {
        setError(res.error)
        setConfirming(false)
      }
      // Siker esetén a revalidate újrarendereli a listát, a sor eltűnik.
    })
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => setError(null)}
        className="max-w-[16rem] rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-left text-xs font-medium text-red-600"
        title="Kattints a bezáráshoz"
      >
        {error}
      </button>
    )
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={doDelete}
          disabled={pending}
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? 'Törlés…' : 'Igen, törlöm'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          Mégse
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
    >
      Törlés
    </button>
  )
}
