export type StockStatusz =
  | 'puffer'
  | 'betarolva'
  | 'kigyujtve'
  | 'kiadva'
  | 'selejtezve'

export type SelejtOk = 'serult' | 'lejart' | 'hiany' | 'egyeb'

export type MovementTipus =
  | 'bevetelezes'
  | 'betarolas'
  | 'kigyujtes'
  | 'kiadas'
  | 'atrarolas'
  | 'selejtezes'
  | 'korrekcio'

export const MOVEMENT_TIPUS_LABEL: Record<MovementTipus, string> = {
  bevetelezes: 'Bevételezés',
  betarolas: 'Betárolás',
  kigyujtes: 'Kigyűjtés',
  kiadas: 'Kiszállítás',
  atrarolas: 'Átrárolás',
  selejtezes: 'Selejtezés',
  korrekcio: 'Korrekció',
}

/** Badge-szín típusonként a tranzakciós nézethez (Tailwind osztályok). */
export const MOVEMENT_TIPUS_COLOR: Record<MovementTipus, string> = {
  bevetelezes: 'bg-emerald-100 text-emerald-700',
  betarolas: 'bg-sky-100 text-sky-700',
  kigyujtes: 'bg-violet-100 text-violet-700',
  kiadas: 'bg-blue-100 text-blue-700',
  atrarolas: 'bg-amber-100 text-amber-700',
  selejtezes: 'bg-red-100 text-red-700',
  // A korrekció utólagos javítás, nem valódi árumozgás - semleges szín.
  korrekcio: 'bg-slate-200 text-slate-700',
}

export const MOVEMENT_TIPUS_OPTIONS = (
  Object.keys(MOVEMENT_TIPUS_LABEL) as MovementTipus[]
).map((value) => ({ value, label: MOVEMENT_TIPUS_LABEL[value] }))

export const STOCK_STATUSZ_LABEL: Record<StockStatusz, string> = {
  puffer: 'Puffer',
  betarolva: 'Betárolva',
  kigyujtve: 'Kigyűjtve',
  kiadva: 'Kiszállítva',
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

/** Kiszerelés-katalógus egy eleme a bevételezés/kiszállítás beviteléhez. */
export type UnitCatalogItem = {
  unit_id: string
  product_id: string
  product_nev: string
  kiszereles: string
  vonalkod: string | null
  mennyiseg_alapegysegben: number
  // Nettó űrtartalom + egység (opcionális: nem minden katalógus-építő tölti ki).
  netto_urtartalom?: number | null
  urtartalom_egyseg?: 'ml' | 'l' | null
}
