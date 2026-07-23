import { requireAdmin } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { FelhasznalokManager } from './FelhasznalokManager'

export type ManagedUser = {
  id: string
  email: string
  nev: string | null
  role: 'staff' | 'admin'
  aktiv: boolean
  created_at: string
}

export default async function FelhasznalokPage() {
  const { user } = await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_list_users')
  const users = (data ?? []) as ManagedUser[]

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-slate-900">Felhasználók</h1>
      <p className="mt-1 text-sm text-slate-500">
        Új felhasználó létrehozása, jogosultság és állapot kezelése. Nincs
        nyilvános regisztráció.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600">Hiba: {error.message}</p>
      )}

      <div className="mt-6">
        <FelhasznalokManager users={users} currentUserId={user.id} />
      </div>
    </div>
  )
}
