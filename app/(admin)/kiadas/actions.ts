'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function kiadAction(payload: {
  vevo_nev: string
  datum: string | null
  stock_item_ids: string[]
}): Promise<{ error?: string; noteId?: string }> {
  if (!payload.stock_item_ids || payload.stock_item_ids.length === 0)
    return { error: 'Válassz ki legalább egy kigyűjtött tételt.' }
  if (!payload.vevo_nev.trim()) return { error: 'Add meg a vevő nevét.' }

  const supabase = await createClient()
  const { data: noteId, error } = await supabase.rpc('kiad', {
    p_vevo_nev: payload.vevo_nev.trim(),
    p_datum: payload.datum || null,
    p_stock_item_ids: payload.stock_item_ids,
  })
  if (error) return { error: error.message }

  revalidatePath('/kiadas')
  return { noteId: noteId as string }
}
