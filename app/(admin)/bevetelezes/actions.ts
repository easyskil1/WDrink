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
  /** A beszállító szállítólevelének száma - a bevételezés elsődleges azonosítója. */
  szallitolevel_szam: string | null
  datum: string | null
  fenykep_url: string | null
  items: BevItem[]
}

export type BevResult = {
  error?: string
  /** Belső azonosító (BEV-...), nem a beszállító papírszáma. */
  sorszam?: string
  szallitolevel_szam?: string
  note_id?: string
  /** false, ha a tételek egy MÁR LÉTEZŐ szállítólevélhez fűződtek hozzá. */
  uj_level?: boolean
  tetelek?: number
}

/** A create_bevetelezes v2 RPC jsonb visszatérése. */
type RpcResult = {
  note_id: string
  sorszam: string
  szallitolevel_szam: string
  uj_level: boolean
  tetelek: number
}

function revalidateBev(noteId?: string) {
  revalidatePath('/bevetelezes')
  revalidatePath('/betarolas')
  if (noteId) revalidatePath(`/bevetelezes/${noteId}`)
}

export async function createBevetelezes(
  payload: BevPayload
): Promise<BevResult> {
  const szl = payload.szallitolevel_szam?.trim()
  if (!szl) return { error: 'Adj meg szállítólevél számot.' }
  if (!payload.supplier_id) return { error: 'Válassz beszállítót.' }
  if (!payload.items || payload.items.length === 0) {
    return { error: 'Adj hozzá legalább egy tételt.' }
  }
  for (const it of payload.items) {
    if (!it.product_unit_id) return { error: 'Minden tételnél válassz terméket.' }
    if (!it.mennyiseg || it.mennyiseg <= 0)
      return { error: 'Minden tételnél adj meg pozitív mennyiséget.' }
  }

  const supabase = await createClient()
  // A v2 RPC jsonb-t ad vissza (note_id + sorszam + ...), ezért a sorszámért NEM
  // kell külön lekérdezés - ez volt a Feladatlista 2 / G2 tétele.
  const { data, error } = await supabase.rpc('create_bevetelezes', {
    p_supplier_id: payload.supplier_id,
    p_szallitolevel_szam: szl,
    p_datum: payload.datum || null,
    p_fenykep_url: payload.fenykep_url || null,
    p_items: payload.items,
  })

  if (error) return { error: error.message }

  const r = data as RpcResult | null
  revalidateBev(r?.note_id)
  return {
    sorszam: r?.sorszam ?? '-',
    szallitolevel_szam: r?.szallitolevel_szam ?? szl,
    note_id: r?.note_id,
    uj_level: r?.uj_level ?? true,
    tetelek: r?.tetelek ?? payload.items.length,
  }
}

/** Szállítólevél fejlécének módosítása (nem érinti a készletet). */
export async function updateBevetelezesNote(payload: {
  note_id: string
  supplier_id: string | null
  szallitolevel_szam: string | null
  datum: string | null
  ekaer_szam: string | null
  fenykep_url: string | null
}): Promise<{ error?: string }> {
  const szl = payload.szallitolevel_szam?.trim()
  if (!szl) return { error: 'Adj meg szállítólevél számot.' }
  if (!payload.supplier_id) return { error: 'Válassz beszállítót.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_bevetelezes_note', {
    p_note_id: payload.note_id,
    p_supplier_id: payload.supplier_id,
    p_szallitolevel_szam: szl,
    p_datum: payload.datum || null,
    p_ekaer_szam: payload.ekaer_szam || null,
    p_fenykep_url: payload.fenykep_url || null,
  })
  if (error) return { error: error.message }

  revalidateBev(payload.note_id)
  return {}
}

/**
 * Bevételezett tétel javítása. A mennyiség-változás korrekciós mozgást hagy a
 * movement_log-ban (tipus='korrekcio', előjeles delta), tehát a javítás nem
 * csendes UPDATE - a nyomkövetés megmarad.
 */
export async function korrigalBevetelezesTetel(payload: {
  note_id: string
  stock_item_id: string
  /** Alapegységben (db), NEM a kiszerelés egységében. */
  uj_mennyiseg_alap: number
  lot_szam: string | null
  lejarat_datum: string | null
  megjegyzes: string | null
}): Promise<{ error?: string }> {
  if (
    !Number.isFinite(payload.uj_mennyiseg_alap) ||
    payload.uj_mennyiseg_alap < 0
  ) {
    return { error: 'A mennyiség nem lehet negatív.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('korrigal_bevetelezes_tetel', {
    p_stock_item_id: payload.stock_item_id,
    p_uj_mennyiseg_alap: Math.round(payload.uj_mennyiseg_alap),
    p_lot: payload.lot_szam || null,
    p_lejarat: payload.lejarat_datum || null,
    p_megjegyzes: payload.megjegyzes || null,
  })
  if (error) return { error: error.message }

  revalidateBev(payload.note_id)
  revalidatePath('/tranzakciok')
  return {}
}

/** Tétel teljes visszavonása (mennyiség 0; a sor, a LOT és a lejárat megmarad). */
export async function sztornoBevetelezesTetel(payload: {
  note_id: string
  stock_item_id: string
  megjegyzes: string | null
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('sztorno_bevetelezes_tetel', {
    p_stock_item_id: payload.stock_item_id,
    p_megjegyzes: payload.megjegyzes || null,
  })
  if (error) return { error: error.message }

  revalidateBev(payload.note_id)
  revalidatePath('/tranzakciok')
  return {}
}
