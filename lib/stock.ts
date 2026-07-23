export type StockStatusz =
  | 'puffer'
  | 'betarolva'
  | 'kigyujtve'
  | 'kiadva'
  | 'selejtezve'

export type SelejtOk = 'serult' | 'lejart' | 'hiany' | 'egyeb'

export const STOCK_STATUSZ_LABEL: Record<StockStatusz, string> = {
  puffer: 'Puffer',
  betarolva: 'Betárolva',
  kigyujtve: 'Kigyűjtve',
  kiadva: 'Kiadva',
  selejtezve: 'Selejtezve',
}

export const SELEJT_OK_LABEL: Record<SelejtOk, string> = {
  serult: 'Sérült',
  lejart: 'Lejárt',
  hiany: 'Hiány',
  egyeb: 'Egyéb',
}

export const SELEJT_OK_OPTIONS = (
  Object.keys(SELEJT_OK_LABEL) as SelejtOk[]
).map((value) => ({ value, label: SELEJT_OK_LABEL[value] }))

/** Kiszerelés-katalógus egy eleme a bevételezés/kiadás beviteléhez. */
export type UnitCatalogItem = {
  unit_id: string
  product_id: string
  product_nev: string
  kiszereles: string
  vonalkod: string | null
  mennyiseg_alapegysegben: number
}
