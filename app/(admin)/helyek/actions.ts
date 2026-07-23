'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeTeljesKod, type LocationTipus } from '@/lib/locations'

export type LocationFormState = { error?: string }

const TIPUS_VALUES: LocationTipus[] = ['pick', 'raktar', 'puffer', 'karanten']

function parseForm(formData: FormData) {
  const sor = String(formData.get('sor') ?? '').trim()
  const polc = String(formData.get('polc') ?? '').trim()
  const polcsor = String(formData.get('polcsor') ?? '').trim()
  const tarhely = String(formData.get('tarhely') ?? '').trim()
  const tipusRaw = String(formData.get('tipus') ?? '')
  const aktiv = formData.get('aktiv') === 'on'
  const tipus = (TIPUS_VALUES as string[]).includes(tipusRaw)
    ? (tipusRaw as LocationTipus)
    : 'raktar'

  return { sor, polc, polcsor, tarhely, tipus, aktiv }
}

function validate(v: ReturnType<typeof parseForm>): string | null {
  if (!v.sor || !v.polc || !v.polcsor || !v.tarhely) {
    return 'A sor, polc, polcsor és tárhely mezők kötelezők.'
  }
  return null
}

export async function createLocation(
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const v = parseForm(formData)
  const err = validate(v)
  if (err) return { error: err }

  const supabase = await createClient()
  const qr_kod = computeTeljesKod(v)

  const { error } = await supabase.from('locations').insert({
    sor: v.sor,
    polc: v.polc,
    polcsor: v.polcsor,
    tarhely: v.tarhely,
    tipus: v.tipus,
    aktiv: v.aktiv,
    qr_kod,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ez a tárhely (vagy QR kód) már létezik.' }
    }
    return { error: 'Mentési hiba: ' + error.message }
  }

  revalidatePath('/helyek')
  redirect('/helyek')
}

export async function updateLocation(
  id: string,
  _prev: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const v = parseForm(formData)
  const err = validate(v)
  if (err) return { error: err }

  const supabase = await createClient()
  const qr_kod = computeTeljesKod(v)

  const { error } = await supabase
    .from('locations')
    .update({
      sor: v.sor,
      polc: v.polc,
      polcsor: v.polcsor,
      tarhely: v.tarhely,
      tipus: v.tipus,
      aktiv: v.aktiv,
      qr_kod,
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Ez a tárhely (vagy QR kód) már létezik.' }
    }
    return { error: 'Mentési hiba: ' + error.message }
  }

  revalidatePath('/helyek')
  redirect('/helyek')
}

export async function toggleLocationActive(id: string, aktiv: boolean) {
  const supabase = await createClient()
  await supabase.from('locations').update({ aktiv }).eq('id', id)
  revalidatePath('/helyek')
}
