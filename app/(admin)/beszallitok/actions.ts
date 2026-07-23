'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type SupplierFormState = { error?: string }

function parse(formData: FormData) {
  return {
    nev: String(formData.get('nev') ?? '').trim(),
    adoszam: String(formData.get('adoszam') ?? '').trim() || null,
    cim: String(formData.get('cim') ?? '').trim() || null,
    kapcsolattarto: String(formData.get('kapcsolattarto') ?? '').trim() || null,
  }
}

export async function createSupplier(
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const v = parse(formData)
  if (!v.nev) return { error: 'A név kötelező.' }

  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').insert(v)
  if (error) return { error: 'Mentési hiba: ' + error.message }

  revalidatePath('/beszallitok')
  redirect('/beszallitok')
}

export async function updateSupplier(
  id: string,
  _prev: SupplierFormState,
  formData: FormData
): Promise<SupplierFormState> {
  const v = parse(formData)
  if (!v.nev) return { error: 'A név kötelező.' }

  const supabase = await createClient()
  const { error } = await supabase.from('suppliers').update(v).eq('id', id)
  if (error) return { error: 'Mentési hiba: ' + error.message }

  revalidatePath('/beszallitok')
  redirect('/beszallitok')
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  await supabase.from('suppliers').delete().eq('id', id)
  revalidatePath('/beszallitok')
}
