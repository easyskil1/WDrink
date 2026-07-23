'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { login, type LoginState } from './actions'

function LoginForm() {
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom') ?? '/'
  const noAccess = searchParams.get('error') === 'no_access'

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {}
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectedFrom" value={redirectedFrom} />

      {noAccess && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Ehhez a felhasználóhoz nincs hozzáférés rendelve. Fordulj az adminhoz.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Jelszó
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />
      </label>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? 'Belépés…' : 'Belépés'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Drink World Győr
          </h1>
          <p className="mt-1 text-sm text-slate-500">Logisztikai admin</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
