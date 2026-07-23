'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function atrarolAction(payload: {
  stock_item_id: string
  cel_location_id: string
  mennyiseg: number
}): Promise<{ error?: string }> {
  if (!payload.cel_location_id) return { error: 'Válassz cél tárhelyet.' }
  if (!payload.mennyiseg || payload.mennyiseg <= 0)
    return { error: 'Adj meg pozitív mennyiséget.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('atrarol', {
    p_stock_item_id: payload.stock_item_id,
    p_cel_location_id: payload.cel_location_id,
    p_mennyiseg: payload.mennyiseg,
  })
  if (error) return { error: error.message }

  revalidatePath('/atrarolas')
  return {}
}
