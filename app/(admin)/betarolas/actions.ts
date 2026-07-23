'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function betarolAction(payload: {
  stock_item_id: string
  location_id: string
  mennyiseg: number
}): Promise<{ error?: string }> {
  if (!payload.location_id) return { error: 'Válassz cél tárhelyet.' }
  if (!payload.mennyiseg || payload.mennyiseg <= 0)
    return { error: 'Adj meg pozitív mennyiséget.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('betarol', {
    p_stock_item_id: payload.stock_item_id,
    p_location_id: payload.location_id,
    p_mennyiseg: payload.mennyiseg,
  })
  if (error) return { error: error.message }

  revalidatePath('/betarolas')
  return {}
}

export async function selejtBetarolasAction(payload: {
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
    p_forras_lepes: 'betarolas',
    p_megjegyzes: payload.megjegyzes,
  })
  if (error) return { error: error.message }

  revalidatePath('/betarolas')
  return {}
}
