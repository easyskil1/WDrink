/**
 * Közös "bip" hang a szkenneléshez.
 *
 * Egyetlen, modulszintű AudioContext. FONTOS iOS Safari miatt: a hangot
 * felhasználói gesztusból kell feloldani (`unlockAudio`), különben a böngésző
 * némán elnyeli. Ezért a ScanButton koppintásakor (ami megnyitja a szkennert)
 * hívjuk az unlockAudio-t - az még valódi gesztus.
 *
 * Megjegyzés: ha a telefon fizikai néma/csendes kapcsolója be van kapcsolva,
 * iOS-en a Web Audio is elnémulhat - ez böngészőből nem megkerülhető.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (Ctx) ctx = new Ctx()
  }
  return ctx
}

/** Felhasználói gesztusból hívd: létrehozza és feloldja az AudioContext-et. */
export function unlockAudio(): void {
  try {
    const c = getCtx()
    if (c && c.state === 'suspended') void c.resume()
  } catch {
    // a hang nem kritikus
  }
}

/** Rövid "bip" - minden sikeres beolvasásnál. */
export function playBeep(): void {
  const c = getCtx()
  if (!c) return
  try {
    if (c.state === 'suspended') void c.resume()
    const t = c.currentTime
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'square'
    osc.frequency.value = 1760
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
    osc.connect(gain).connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.16)
  } catch {
    // a hang nem kritikus
  }
}
