export type LocationTipus = 'pick' | 'raktar' | 'puffer' | 'karanten'

export type Location = {
  id: string
  sor: string
  polc: string
  polcsor: string
  tarhely: string
  teljes_kod: string
  qr_kod: string | null
  tipus: LocationTipus
  aktiv: boolean
  created_at: string
  updated_at: string
}

/** Enum slug → magyar címke a UI-hoz. */
export const LOCATION_TIPUS_LABEL: Record<LocationTipus, string> = {
  pick: 'Pick',
  raktar: 'Raktár',
  puffer: 'Puffer',
  karanten: 'Karantén',
}

export const LOCATION_TIPUS_OPTIONS: { value: LocationTipus; label: string }[] =
  (Object.keys(LOCATION_TIPUS_LABEL) as LocationTipus[]).map((value) => ({
    value,
    label: LOCATION_TIPUS_LABEL[value],
  }))

/**
 * A teljes_kod-ot a DB generálja (generated column), de a QR kódhoz és
 * kliens-oldali előnézethez ugyanezt a formulát használjuk.
 */
export function computeTeljesKod(parts: {
  sor: string
  polc: string
  polcsor: string
  tarhely: string
}): string {
  return [parts.sor, parts.polc, parts.polcsor, parts.tarhely]
    .map((p) => p.trim())
    .join('-')
}
