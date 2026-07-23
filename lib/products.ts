export type JovedekiKategoria = 'sor' | 'bor' | 'koztes' | 'alkoholtermek'
export type KiszerelesTipus =
  | 'palack'
  | 'dobozos'
  | 'uveg'
  | 'karton'
  | 'raklap'
  | 'hordo'
export type UrtartalomEgyseg = 'ml' | 'l'
export type BetetdijTipus =
  | 'nincs'
  | 'kotelezo_eldobhato'
  | 'kotelezo_ujrahasznalhato'
  | 'onkentes'

export type ProductUnit = {
  id: string
  product_id: string
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

export type Product = {
  id: string
  nev: string
  kategoria: string | null
  gyarto_beszallito_id: string | null
  leiras: string | null
  alkoholtartalom: number | null
  jovedeki: boolean
  jovedeki_termekkategoria: JovedekiKategoria | null
  kn_kod: string | null
  fajtakod: string | null
  min_keszlet: number
  aktiv: boolean
  created_at: string
  updated_at: string
}

export const JOVEDEKI_KATEGORIA_LABEL: Record<JovedekiKategoria, string> = {
  sor: 'Sör',
  bor: 'Bor',
  koztes: 'Köztes alkoholtermék',
  alkoholtermek: 'Alkoholtermék',
}

export const KISZERELES_LABEL: Record<KiszerelesTipus, string> = {
  palack: 'Palack',
  dobozos: 'Dobozos',
  uveg: 'Üveg',
  karton: 'Karton',
  raklap: 'Raklap',
  hordo: 'Hordó',
}

export const URTARTALOM_EGYSEG_LABEL: Record<UrtartalomEgyseg, string> = {
  ml: 'ml',
  l: 'l',
}

export const BETETDIJ_LABEL: Record<BetetdijTipus, string> = {
  nincs: 'Nincs',
  kotelezo_eldobhato: 'Kötelező (eldobható)',
  kotelezo_ujrahasznalhato: 'Kötelező (újrahasználható)',
  onkentes: 'Önkéntes',
}

export function labelOptions<T extends string>(
  map: Record<T, string>
): { value: T; label: string }[] {
  return (Object.keys(map) as T[]).map((value) => ({
    value,
    label: map[value],
  }))
}
