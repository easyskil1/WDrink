'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function kigyujtAction(payload: {
  stock_item_id: string
  mennyiseg: number
}): Promise<{ error?: string }> {
  if (!payload.mennyiseg || payload.mennyiseg <= 0)
    return { error: 'Adj meg pozitív mennyiséget.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('kigyujt', {
    p_stock_item_id: payload.stock_item_id,
    p_mennyiseg: payload.mennyiseg,
  })
  if (error) return { error: error.message }

  revalidatePath('/kigyujtes')
  revalidatePath('/kiadas')
  return {}
}

export async function selejtKigyujtesAction(payload: {
  stock_item_id: string
  mennyiseg: number
  selejt_ok: string
  megjegyzes: string | null
}): Promise<{ error?: string }> {
  if (!payload.mennyiseg || payload.mennyiseg <= 0)
    return { error: 'Adj meg pozitív mennyiséget.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('selejtez', {
    p_stock_item_id: payload.stock_item_id,
    p_mennyiseg: payload.mennyiseg,
    p_selejt_ok: payload.selejt_ok,
    p_forras_lepes: 'kigyujtes',
    p_megjegyzes: payload.megjegyzes,
  })
  if (error) return { error: error.message }

  revalidatePath('/kigyujtes')
  return {}
}
