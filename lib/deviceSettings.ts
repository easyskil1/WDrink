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
