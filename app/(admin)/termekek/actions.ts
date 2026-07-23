'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type {
  BetetdijTipus,
  JovedekiKategoria,
  KiszerelesTipus,
  UrtartalomEgyseg,
} from '@/lib/products'

export type ProductFormState = { error?: string }

type UnitInput = {
  id?: string
  kiszereles: KiszerelesTipus
  vonalkod: string | null
  mennyiseg_alapegysegben: number
  netto_urtartalom: number | null
  urtartalom_egyseg: UrtartalomEgyseg | null
  netto_ar: number | null
  brutto_ar: number | null
  afa_kulcs: number
  beszerzesi_ar: number | null
  betetdij_tipus: BetetdijTipus
  betetdij_osszeg: number
}

const KISZERELES: KiszerelesTipus[] = [
  'palack', 'dobozos', 'uveg', 'karton', 'raklap', 'hordo',
]
const BETETDIJ: BetetdijTipus[] = [
  'nincs', 'kotelezo_eldobhato', 'kotelezo_ujrahasznalhato', 'onkentes',
]
const JOVEDEKI_KAT: JovedekiKategoria[] = ['sor', 'bor', 'koztes', 'alkoholtermek']

function num(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function parseProduct(formData: FormData) {
  const jovedeki = formData.get('jovedeki') === 'on'
  const katRaw = String(formData.get('jovedeki_termekkategoria') ?? '')
  return {
    nev: String(formData.get('nev') ?? '').trim(),
    kategoria: String(formData.get('kategoria') ?? '').trim() || null,
    gyarto_beszallito_id:
      String(formData.get('gyarto_beszallito_id') ?? '').trim() || null,
    leiras: String(formData.get('leiras') ?? '').trim() || null,
    alkoholtartalom: num(formData.get('alkoholtartalom')),
    jovedeki,
    jovedeki_termekkategoria:
      jovedeki && (JOVEDEKI_KAT as string[]).includes(katRaw)
        ? (katRaw as JovedekiKategoria)
        : null,
    kn_kod: String(formData.get('kn_kod') ?? '').trim() || null,
    fajtakod: String(formData.get('fajtakod') ?? '').trim() || null,
    min_keszlet: Math.max(0, Math.trunc(num(formData.get('min_keszlet')) ?? 0)),
    aktiv: formData.get('aktiv') === 'on',
  }
}

function parseUnits(formData: FormData): UnitInput[] | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(String(formData.get('units') ?? '[]'))
  } catch {
    return { error: 'Hibás kiszerelés-adatok.' }
  }
  if (!Array.isArray(raw)) return []

  const units: UnitInput[] = []
  for (const [i, r] of raw.entries()) {
    const kiszereles = String(r?.kiszereles ?? '')
    if (!(KISZERELES as string[]).includes(kiszereles)) {
      return { error: `${i + 1}. kiszerelés: érvénytelen típus.` }
    }
    const menny = Math.trunc(num(r?.mennyiseg_alapegysegben) ?? 0)
    if (menny <= 0) {
      return {
        error: `${i + 1}. kiszerelés: a mennyiség (alapegység) legyen > 0.`,
      }
    }
    const betetdij = String(r?.betetdij_tipus ?? 'nincs')
    const egyseg = String(r?.urtartalom_egyseg ?? '')
    units.push({
      id: r?.id ? String(r.id) : undefined,
      kiszereles: kiszereles as KiszerelesTipus,
      vonalkod: String(r?.vonalkod ?? '').trim() || null,
      mennyiseg_alapegysegben: menny,
      netto_urtartalom: num(r?.netto_urtartalom),
      urtartalom_egyseg:
        egyseg === 'ml' || egyseg === 'l' ? (egyseg as UrtartalomEgyseg) : null,
      netto_ar: num(r?.netto_ar),
      brutto_ar: num(r?.brutto_ar),
      afa_kulcs: num(r?.afa_kulcs) ?? 27,
      beszerzesi_ar: num(r?.beszerzesi_ar),
      betetdij_tipus: (BETETDIJ as string[]).includes(betetdij)
        ? (betetdij as BetetdijTipus)
        : 'nincs',
      betetdij_osszeg: num(r?.betetdij_osszeg) ?? 0,
    })
  }
  return units
}

/** Vonalkód-egyediség: űrlapon belül + a DB-ben (más unit-okhoz képest). */
async function checkBarcodes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  units: UnitInput[]
): Promise<string | null> {
  const withCode = units.filter((u) => u.vonalkod)
  const codes = withCode.map((u) => u.vonalkod!)

  const seen = new Set<string>()
  for (const c of codes) {
    if (seen.has(c)) return `A(z) "${c}" vonalkód többször szerepel.`
    seen.add(c)
  }
  if (codes.length === 0) return null

  const ownIds = units.map((u) => u.id).filter(Boolean) as string[]
  const { data: existing } = await supabase
    .from('product_units')
    .select('id, vonalkod')
    .in('vonalkod', codes)

  for (const row of existing ?? []) {
    if (!ownIds.includes(row.id)) {
      return `A(z) "${row.vonalkod}" vonalkód már egy másik terméknél szerepel.`
    }
  }
  return null
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const p = parseProduct(formData)
  if (!p.nev) return { error: 'A termék neve kötelező.' }

  const unitsParsed = parseUnits(formData)
  if ('error' in unitsParsed) return unitsParsed
  const units = unitsParsed

  const supabase = await createClient()
  const barcodeErr = await checkBarcodes(supabase, units)
  if (barcodeErr) return { error: barcodeErr }

  const { data: product, error } = await supabase
    .from('products')
    .insert(p)
    .select('id')
    .single()
  if (error || !product) {
    return { error: 'Mentési hiba: ' + (error?.message ?? 'ismeretlen') }
  }

  if (units.length > 0) {
    const { error: uErr } = await supabase.from('product_units').insert(
      units.map((u) => ({ ...unitRow(u), product_id: product.id }))
    )
    if (uErr) {
      // Kompenzáció: ne maradjon kiszerelés nélküli, félig mentett termék.
      await supabase.from('products').delete().eq('id', product.id)
      return { error: 'Kiszerelés mentési hiba: ' + uErr.message }
    }
  }

  revalidatePath('/termekek')
  redirect('/termekek')
}

export async function updateProduct(
  id: string,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const p = parseProduct(formData)
  if (!p.nev) return { error: 'A termék neve kötelező.' }

  const unitsParsed = parseUnits(formData)
  if ('error' in unitsParsed) return unitsParsed
  const units = unitsParsed

  const supabase = await createClient()
  const barcodeErr = await checkBarcodes(supabase, units)
  if (barcodeErr) return { error: barcodeErr }

  const { error } = await supabase.from('products').update(p).eq('id', id)
  if (error) return { error: 'Mentési hiba: ' + error.message }

  // Kiszerelések diffelése: törlés, frissítés, beszúrás.
  const { data: existing } = await supabase
    .from('product_units')
    .select('id')
    .eq('product_id', id)
  const existingIds = new Set((existing ?? []).map((r) => r.id as string))
  const keptIds = new Set(units.map((u) => u.id).filter(Boolean) as string[])

  const toDelete = [...existingIds].filter((eid) => !keptIds.has(eid))
  if (toDelete.length > 0) {
    await supabase.from('product_units').delete().in('id', toDelete)
  }

  for (const u of units) {
    if (u.id && existingIds.has(u.id)) {
      const { error: uErr } = await supabase
        .from('product_units')
        .update(unitRow(u))
        .eq('id', u.id)
      if (uErr) return { error: 'Kiszerelés frissítési hiba: ' + uErr.message }
    } else {
      const { error: uErr } = await supabase
        .from('product_units')
        .insert({ ...unitRow(u), product_id: id })
      if (uErr) return { error: 'Kiszerelés mentési hiba: ' + uErr.message }
    }
  }

  revalidatePath('/termekek')
  redirect('/termekek')
}

function unitRow(u: UnitInput) {
  return {
    kiszereles: u.kiszereles,
    vonalkod: u.vonalkod,
    mennyiseg_alapegysegben: u.mennyiseg_alapegysegben,
    netto_urtartalom: u.netto_urtartalom,
    urtartalom_egyseg: u.urtartalom_egyseg,
    netto_ar: u.netto_ar,
    brutto_ar: u.brutto_ar,
    afa_kulcs: u.afa_kulcs,
    beszerzesi_ar: u.beszerzesi_ar,
    betetdij_tipus: u.betetdij_tipus,
    betetdij_osszeg: u.betetdij_osszeg,
  }
}

export async function toggleProductActive(id: string, aktiv: boolean) {
  const supabase = await createClient()
  await supabase.from('products').update({ aktiv }).eq('id', id)
  revalidatePath('/termekek')
}
