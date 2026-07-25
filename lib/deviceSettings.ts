/**
 * Eszköz-szintű (készülékhez kötött) beállítások, localStorage-ban.
 *
 * Ezek NEM felhasználóhoz, hanem az adott böngészőhöz/telefonhoz tartoznak
 * (pl. a szkenner viselkedése), ezért nem a szerveren tároljuk.
 */

export const CONTINUOUS_SCAN_KEY = 'dw-continuous-scan'

export function getContinuousScan(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(CONTINUOUS_SCAN_KEY) === '1'
}

export function setContinuousScan(on: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONTINUOUS_SCAN_KEY, on ? '1' : '0')
}

/**
 * Készletlisták megjelenítési felső korlátja - eszköz-szintű.
 *
 * FONTOS: NEM localStorage, hanem COOKIE, mert a szerveroldali lekérdezésnek
 * (a listák betöltésekor) kérésenként olvasnia kell (a localStorage-hoz a
 * szerver nem fér hozzá). A cookie minden útvonalra elmegy.
 */
export const KESZLET_LIMIT_COOKIE = 'dw-keszlet-limit'
export const DEFAULT_KESZLET_LISTA_LIMIT = 500
export const KESZLET_LIMIT_MIN = 50
export const KESZLET_LIMIT_MAX = 100000

/** Bemenetet érvényes tartományba szorít, hibás/üres esetén a defaultot adja. */
export function clampKeszletLimit(v: string | number | null | undefined): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v ?? ''), 10)
  if (!Number.isFinite(n)) return DEFAULT_KESZLET_LISTA_LIMIT
  return Math.min(KESZLET_LIMIT_MAX, Math.max(KESZLET_LIMIT_MIN, Math.round(n)))
}

export function getKeszletLimit(): number {
  if (typeof document === 'undefined') return DEFAULT_KESZLET_LISTA_LIMIT
  const m = document.cookie.match(/(?:^|;\s*)dw-keszlet-limit=(\d+)/)
  return clampKeszletLimit(m ? m[1] : undefined)
}

export function setKeszletLimit(n: number): void {
  if (typeof document === 'undefined') return
  const v = clampKeszletLimit(n)
  // 1 év, minden útvonalra (a szerver is olvassa a lekérdezésekhez).
  document.cookie = `${KESZLET_LIMIT_COOKIE}=${v}; path=/; max-age=31536000; samesite=lax`
}
