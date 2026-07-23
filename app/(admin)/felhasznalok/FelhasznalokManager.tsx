'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ManagedUser } from './page'
import { createUserAction, setActiveAction, updateRoleAction } from './actions'

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const fieldLabel = 'text-xs font-medium text-slate-500'

function NewUser() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nev, setNev] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function submit() {
    setError(null)
    setOk(null)
    setPending(true)
    const res = await createUserAction({ email, nev, password, role })
    setPending(false)
    if (res.error) return setError(res.error)
    setOk(`Felhasználó létrehozva: ${email}`)
    setEmail('')
    setNev('')
    setPassword('')
    setRole('staff')
    router.refresh()
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">Új felhasználó</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Név</span>
          <input value={nev} onChange={(e) => setNev(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Ideiglenes jelszó *</span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Jogosultság</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
            className={input}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          {ok}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? 'Létrehozás…' : 'Létrehozás'}
      </button>
    </section>
  )
}

function UserRow({
  u,
  isSelf,
}: {
  u: ManagedUser
  isSelf: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function changeRole(role: 'staff' | 'admin') {
    setError(null)
    setPending(true)
    const res = await updateRoleAction(u.id, role)
    setPending(false)
    if (res.error) return setError(res.error)
    router.refresh()
  }
  async function toggleActive() {
    setError(null)
    setPending(true)
    const res = await setActiveAction(u.id, !u.aktiv)
    setPending(false)
    if (res.error) return setError(res.error)
    router.refresh()
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
          {u.nev || u.email}
          {isSelf && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              te
            </span>
          )}
          {!u.aktiv && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              inaktív
            </span>
          )}
        </p>
        <p className="text-sm text-slate-500">{u.email}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <select
          value={u.role}
          disabled={pending || isSelf}
          onChange={(e) => changeRole(e.target.value as 'staff' | 'admin')}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60"
          title={isSelf ? 'A saját szerepedet nem módosíthatod itt' : ''}
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="button"
          onClick={toggleActive}
          disabled={pending || isSelf}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {u.aktiv ? 'Deaktivál' : 'Aktivál'}
        </button>
      </div>
    </li>
  )
}

export function FelhasznalokManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[]
  currentUserId: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <NewUser />
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <UserRow key={u.id} u={u} isSelf={u.id === currentUserId} />
        ))}
      </ul>
    </div>
  )
}
