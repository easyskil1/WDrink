'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Közös vonalkód/QR olvasó.
 *
 * Motor (a `barcode-detector` ponyfill mintájára):
 *  - **Natív `BarcodeDetector`**, ha a böngésző támogatja (Android Chrome) –
 *    azonnali, nincs WASM letöltés.
 *  - **ZXing-C++ WASM fallback** (iPhone Safari), dinamikusan importálva, hogy
 *    az Androidos userek ne fizessék meg a bundle-méretet. A `.wasm` binárist
 *    **self-hostoljuk** (`/public/zxing_reader.wasm`), így raktári wifin sincs
 *    külső CDN-függés.
 *
 * Kamera indítás – FONTOS iOS Chrome miatt:
 *  A `getUserMedia`-t **közvetlen felhasználói koppintásból** ("Kamera indítása"
 *  gomb) hívjuk. iOS Chrome (WKWebView) gesztus nélkül – pl. `useEffect`-ből –
 *  elutasítja a kamerát. Ezért NEM automatikusan indítjuk élő módban, hanem
 *  gombra. Ott, ahol a böngésző úgyis engedi (Android, iOS Safari, asztali),
 *  a gomb egyszeri koppintás; a fotó-mód csak kézi, másodlagos opció.
 */

type DetectedCode = { rawValue: string; format?: string }
type DetectorLike = {
  detect: (source: CanvasImageSource | Blob | ImageBitmap) => Promise<DetectedCode[]>
}

// Raktári használatra releváns formátumok: EAN/UPC termék-vonalkódok,
// Code128/39 belső címkék, QR a tárhelyekhez, ITF karton-kódokhoz.
const FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'itf',
  'codabar',
  'data_matrix',
  'pdf417',
] as const

// Van-e egyáltalán kamera-API (getUserMedia)? Secure contexthez (HTTPS) kötött.
function hasCameraApi(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

// Ideiglenes diagnosztika: pontosan mit tud a böngésző. Segít eldönteni, miért
// nem indul a kamera (pl. iOS Chrome getUserMedia hiány).
function cameraDiagnostics(): string {
  if (typeof navigator === 'undefined') return 'nincs navigator'
  const md = navigator.mediaDevices
  const secure = typeof window !== 'undefined' ? String(window.isSecureContext) : '?'
  const ua = navigator.userAgent || ''
  const brand = /CriOS/.test(ua)
    ? 'Chrome-iOS'
    : /FxiOS/.test(ua)
      ? 'Firefox-iOS'
      : /EdgiOS/.test(ua)
        ? 'Edge-iOS'
        : /Safari/.test(ua) && /Version\//.test(ua)
          ? 'Safari'
          : 'egyéb'
  return [
    `böngésző: ${brand}`,
    `secureContext: ${secure}`,
    `mediaDevices: ${md ? 'van' : 'NINCS'}`,
    `getUserMedia: ${typeof md?.getUserMedia === 'function' ? 'van' : 'NINCS'}`,
    `BarcodeDetector: ${'BarcodeDetector' in globalThis ? 'natív' : 'WASM'}`,
  ].join(' · ')
}

// Natív-preferáló detektor létrehozása. Androidon a beépített motort adja
// vissza (nincs letöltés), egyébként a self-hostolt WASM ponyfillt.
async function createDetector(): Promise<{ detector: DetectorLike; engine: 'native' | 'wasm' }> {
  const NativeBD = (globalThis as unknown as { BarcodeDetector?: unknown }).BarcodeDetector as
    | (new (opts?: { formats?: readonly string[] }) => DetectorLike)
    | undefined

  if (NativeBD) {
    try {
      const getSupported = (NativeBD as unknown as {
        getSupportedFormats?: () => Promise<readonly string[]>
      }).getSupportedFormats
      const supported = getSupported ? await getSupported().catch(() => []) : []
      const formats = supported.length
        ? FORMATS.filter((f) => supported.includes(f))
        : [...FORMATS]
      const detector = new NativeBD(formats.length ? { formats } : undefined)
      return { detector, engine: 'native' }
    } catch {
      // A natív motor mégsem használható – WASM-ra esünk vissza.
    }
  }

  const mod = await import('barcode-detector/ponyfill')
  mod.setZXingModuleOverrides({
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? '/zxing_reader.wasm' : prefix + path,
  })
  const detector = new mod.BarcodeDetector({ formats: [...FORMATS] }) as unknown as DetectorLike
  return { detector, engine: 'wasm' }
}

// Emberi hibaüzenet a getUserMedia hibákra.
function describeCameraError(e: unknown): string {
  const name = (e as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'A kamera engedélyezése le van tiltva. Engedélyezd a kamera-hozzáférést a böngésző beállításaiban, majd próbáld újra.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Nem található kamera ezen az eszközön.'
  }
  if (name === 'NotReadableError') {
    return 'A kamerát egy másik alkalmazás használja. Zárd be, majd próbáld újra.'
  }
  return 'A kamera nem indult el. Próbáld újra, vagy olvass be fotóval.'
}

export function Scanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const detectorRef = useRef<DetectorLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const scanningRef = useRef(false)
  const doneRef = useRef(false)

  const [mode, setMode] = useState<'live' | 'photo'>('live')
  const [engine, setEngine] = useState<'native' | 'wasm' | 'loading'>('loading')
  // A kamera-stream állapota: idle = még nem indítottuk, starting = indul,
  // running = fut, error = hiba (üzenettel).
  const [camState, setCamState] = useState<'idle' | 'starting' | 'running' | 'error'>('idle')
  const [camError, setCamError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)

  // Egyszeri találat-kezelés: leáll, és felfelé jelez.
  const emit = useCallback(
    (text: string) => {
      if (doneRef.current) return
      doneRef.current = true
      scanningRef.current = false
      if (navigator.vibrate) navigator.vibrate(60)
      onResult(text)
    },
    [onResult]
  )

  // Detektor motor betöltése egyszer, mount-kor.
  useEffect(() => {
    let cancelled = false
    createDetector()
      .then(({ detector, engine }) => {
        if (cancelled) return
        detectorRef.current = detector
        setEngine(engine)
      })
      .catch(() => {
        if (!cancelled) setEngine('wasm') // hagyjuk, hogy a fotó/retry úton kiderüljön a valódi hiba
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  // Élő kamera indítása. FONTOS: közvetlen user-gesztusból (gomb onClick) hívjuk,
  // az első valódi művelet a getUserMedia legyen (semmi await előtte), különben
  // iOS Chrome elveszti a gesztust és megtagadja a kamerát.
  const startCamera = useCallback(async () => {
    if (!hasCameraApi()) {
      setCamState('error')
      setCamError(
        'Ez a böngésző nem tesz elérhetővé kamerát (getUserMedia hiányzik). iPhone-on próbáld Safariban megnyitni, vagy használd a fotós beolvasást.'
      )
      return
    }
    stopCamera()
    doneRef.current = false
    setCamState('starting')
    setCamError(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
    } catch (e) {
      const name = (e as { name?: string })?.name || 'ismeretlen'
      setCamState('error')
      setCamError(`${describeCameraError(e)} [${name}]`)
      return
    }

    streamRef.current = stream
    const video = videoRef.current
    if (!video) {
      stopCamera()
      return
    }
    video.srcObject = stream
    try {
      await video.play()
    } catch {
      // Egyes böngészők a play()-t megtagadhatják – a stream ettől még mehet.
    }

    setCamState('running')
    scanningRef.current = true

    let lastScanAt = 0
    const loop = async (now: number) => {
      if (!scanningRef.current) return
      const detector = detectorRef.current
      // ~9 kép/mp: folyamatos, de nem CPU-zabáló.
      if (detector && video.readyState >= 2 && now - lastScanAt > 110) {
        lastScanAt = now
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0 && scanningRef.current) {
            emit(codes[0].rawValue)
            return
          }
        } catch {
          // Átmeneti dekódolási hiba – nem kritikus, megyünk tovább.
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [emit, stopCamera])

  // Leállítás a komponens bezárásakor.
  useEffect(() => stopCamera, [stopCamera])

  // Fotóból dekódolás (kézi, másodlagos mód).
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // ugyanaz a fájl újra kiválasztható legyen
    if (!file) return
    const detector = detectorRef.current
    if (!detector) return
    setDecoding(true)
    setError(null)
    try {
      const bitmap = await createImageBitmap(file)
      let codes: DetectedCode[]
      try {
        codes = await detector.detect(bitmap)
      } finally {
        bitmap.close()
      }
      if (codes.length > 0) {
        emit(codes[0].rawValue)
      } else {
        setError(
          'Nem sikerült vonalkódot felismerni a képen. Próbáld újra: közelebbről, éles, jól megvilágított képpel.'
        )
      }
    } catch {
      setError(
        'Nem sikerült vonalkódot felismerni a képen. Próbáld újra: közelebbről, éles, jól megvilágított képpel.'
      )
    } finally {
      setDecoding(false)
    }
  }

  const engineLoading = engine === 'loading'

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">
          {mode === 'live' ? 'Beolvasás' : 'Beolvasás fotóval'}
        </span>
        <button
          type="button"
          onClick={() => {
            stopCamera()
            onClose()
          }}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          Bezárás
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {mode === 'live' ? (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <div className="relative w-full">
              <video
                ref={videoRef}
                className={`w-full rounded-lg bg-black ${camState === 'running' ? '' : 'hidden'}`}
                playsInline
                muted
              />
              {camState === 'running' && (
                <div className="pointer-events-none absolute inset-0 m-8 rounded-lg border-2 border-white/70" />
              )}
            </div>

            {camState !== 'running' && (
              <div className="flex w-full flex-col items-center gap-3 text-center">
                {camState === 'error' && camError && (
                  <p className="text-sm text-red-300">{camError}</p>
                )}
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={engineLoading || camState === 'starting'}
                  className="w-full rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
                >
                  {engineLoading
                    ? 'Motor betöltése…'
                    : camState === 'starting'
                      ? 'Kamera indítása…'
                      : camState === 'error'
                        ? 'Újra: kamera indítása'
                        : 'Kamera indítása'}
                </button>
                <p className="break-words font-mono text-[10px] leading-relaxed text-white/40">
                  {cameraDiagnostics()}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                stopCamera()
                setMode('photo')
              }}
              className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
            >
              Inkább fotóval olvasok be
            </button>
          </div>
        ) : (
          <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
            {error && <p className="text-sm text-red-300">{error}</p>}
            <p className="text-sm text-white/70">
              Készíts éles fotót a vonalkódról vagy QR kódról.
            </p>
            <label className="cursor-pointer rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100">
              {decoding ? 'Feldolgozás…' : 'Fénykép készítése'}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={decoding || engineLoading}
                onChange={handleFile}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('live')
              }}
              className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
            >
              Vissza az élő kamerához
            </button>
          </div>
        )}
      </div>

      {mode === 'live' && camState === 'running' && (
        <p className="px-4 pb-6 text-center text-xs text-white/60">
          Irányítsd a kamerát a vonalkódra vagy QR kódra.
        </p>
      )}
    </div>
  )
}
