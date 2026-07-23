'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CompanyFormState = { error?: string; ok?: boolean }

export async function updateCompanySettings(
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const row = {
    id: true,
    cegnev: String(formData.get('cegnev') ?? '').trim() || null,
    adoszam: String(formData.get('adoszam') ?? '').trim() || null,
    cim: String(formData.get('cim') ?? '').trim() || null,
    jovedeki_engedelyszam:
      String(formData.get('jovedeki_engedelyszam') ?? '').trim() || null,
    felir_azonosito:
      String(formData.get('felir_azonosito') ?? '').trim() || null,
  }

  const supabase = await createClient()
  const { error } = await supabase.from('company_settings').upsert(row)
  if (error) return { error: 'Mentési hiba: ' + error.message }

  revalidatePath('/beallitasok')
  return { ok: true }
}
