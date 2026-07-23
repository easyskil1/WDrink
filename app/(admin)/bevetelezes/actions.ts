'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type BevItem = {
  product_unit_id: string
  mennyiseg: number // a kiszerelés egységében (pl. 3 karton)
  lot_szam: string | null
  lejarat_datum: string | null
  selejt: boolean
  selejt_ok: string | null
}

export type BevPayload = {
  supplier_id: string | null
  datum: string | null
  fenykep_url: string | null
  items: BevItem[]
}

export async function createBevetelezes(
  payload: BevPayload
): Promise<{ error?: string; sorszam?: string }> {
  if (!payload.items || payload.items.length === 0) {
    return { error: 'Adj hozzá legalább egy tételt.' }
  }
  for (const it of payload.items) {
    if (!it.product_unit_id) return { error: 'Minden tételnél válassz terméket.' }
    if (!it.mennyiseg || it.mennyiseg <= 0)
      return { error: 'Minden tételnél adj meg pozitív mennyiséget.' }
  }

  const supabase = await createClient()
  const { data: noteId, error } = await supabase.rpc('create_bevetelezes', {
    p_supplier_id: payload.supplier_id || null,
    p_datum: payload.datum || null,
    p_fenykep_url: payload.fenykep_url || null,
    p_items: payload.items,
  })

  if (error) return { error: error.message }

  const { data: note } = await supabase
    .from('delivery_notes')
    .select('sorszam')
    .eq('id', noteId)
    .maybeSingle<{ sorszam: string }>()

  revalidatePath('/bevetelezes')
  revalidatePath('/betarolas')
  return { sorszam: note?.sorszam ?? '—' }
}
