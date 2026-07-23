'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function assertAdmin(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: string }>()
  return { ok: data?.role === 'admin' }
}

export async function createUserAction(payload: {
  email: string
  password: string
  nev: string
  role: 'staff' | 'admin'
}): Promise<{ error?: string; ok?: boolean }> {
  const email = payload.email.trim().toLowerCase()
  if (!email) return { error: 'Add meg az email-címet.' }
  if (!payload.password || payload.password.length < 4)
    return { error: 'A jelszó legalább 4 karakter legyen.' }

  if (!(await assertAdmin()).ok) return { error: 'Csak admin hozhat létre felhasználót.' }

  const admin = createAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { nev: payload.nev.trim() || email },
  })
  if (error) return { error: 'Létrehozási hiba: ' + error.message }

  const userId = created.user?.id
  if (userId) {
    // A trigger staff profilt hozott létre; állítsuk be a kért role-t/nevet.
    await admin
      .from('profiles')
      .update({
        role: payload.role,
        nev: payload.nev.trim() || email,
        aktiv: true,
      })
      .eq('id', userId)
  }

  revalidatePath('/felhasznalok')
  return { ok: true }
}

export async function updateRoleAction(
  id: string,
  role: 'staff' | 'admin'
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/felhasznalok')
  return {}
}

export async function setActiveAction(
  id: string,
  aktiv: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update({ aktiv }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/felhasznalok')
  return {}
}
