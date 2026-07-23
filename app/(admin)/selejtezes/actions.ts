'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function selejtOnalloAction(payload: {
  stock_item_id: string
  mennyiseg: number
  selejt_ok: string
  megjegyzes: string | null
  dokumentum_url: string | null
}): Promise<{ error?: string }> {
  if (!payload.mennyiseg || payload.mennyiseg <= 0)
    return { error: 'Adj meg pozitív mennyiséget.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('selejtez', {
    p_stock_item_id: payload.stock_item_id,
    p_mennyiseg: payload.mennyiseg,
    p_selejt_ok: payload.selejt_ok,
    p_forras_lepes: null, // önálló selejtezés, nem egy lépésből
    p_megjegyzes: payload.megjegyzes,
    p_dokumentum_url: payload.dokumentum_url,
  })
  if (error) return { error: error.message }

  revalidatePath('/selejtezes')
  return {}
}
