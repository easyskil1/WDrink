'use client'

import { useEffect, useRef, useState } from 'react'

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
 * Két beolvasási mód:
 *  - "live": folyamatos kamera-stream (getUserMedia) – asztali gépen, Androidon
 *    és iOS Safariban a legkényelmesebb.
 *  - "photo": natív fényképezés (<input capture>) + a képből dekódolás – ott,
 *    ahol az élő kamera nem érhető el (pl. iOS Chrome). Ha a live nem indul,
 *    ide esünk vissza.
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

// Natív-preferáló detektor létrehozása. Androidon a beépített motort adja
// vissza (nincs letöltés), egyébként a self-hostolt WASM ponyfillt.
// Van-e élő kamera (getUserMedia)? iOS Chrome-ban pl. nincs, ott fotó-mód kell.
function hasLiveCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

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
  const doneRef = useRef(false)
  // Kezdőmód: ha nincs getUserMedia (pl. iOS Chrome), rögtön fotó-mód – így nem
  // kell az effekt törzsében setState-elni (cascading render).
  const [mode, setMode] = useState<'live' | 'photo'>(() =>
    hasLiveCamera() ? 'live' : 'photo'
  )
  const [engine, setEngine] = useState<'native' | 'wasm' | 'loading'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)

  // Egyszeri találat-kezelés: leáll, és felfelé jelez.
  function emit(text: string) {
    if (doneRef.current) return
    doneRef.current = true
    if (navigator.vibrate) navigator.vibrate(60)
    onResult(text)
  }

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
        if (!cancelled) setError('A vonalkód-motor betöltése nem sikerült.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Élő kamera + folyamatos felismerő ciklus (csak live módban, ha kész a motor).
  useEffect(() => {
    if (mode !== 'live' || engine === 'loading') return

    // getUserMedia hiányát a kezdőmód már fotó-módra állította; itt csak élő
    // kamerával futunk tovább.
    if (!hasLiveCamera()) return

    let cancelled = false
    let rafId = 0
    let lastScanAt = 0
    const video = videoRef.current

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (!video) return
        video.srcObject = stream
        await video.play()
        rafId = requestAnimationFrame(loop)
      } catch {
        // Az élő kamera nem indult – fotó-móddal még mehet.
        if (!cancelled) setMode('photo')
      }
    }

    async function loop(now: number) {
      if (cancelled) return
      const detector = detectorRef.current
      // ~9 kép/mp: folyamatos, de nem CPU-zabáló.
      if (detector && video && video.readyState >= 2 && now - lastScanAt > 110) {
        lastScanAt = now
        try {
          const codes = await detector.detect(video)
          if (codes.length > 0 && !cancelled) {
            emit(codes[0].rawValue)
            return
          }
        } catch {
          // Átmeneti dekódolási hiba – nem kritikus, megyünk tovább.
        }
      }
      rafId = requestAnimationFrame(loop)
    }

    start()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, engine])

  // Fotóból dekódolás (photo mód).
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

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">
          {mode === 'live' ? 'Beolvasás…' : 'Beolvasás fotóval'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          Bezárás
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        {mode === 'live' ? (
          <>
            <div className="relative w-full max-w-md">
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                playsInline
                muted
              />
              <div className="pointer-events-none absolute inset-0 m-8 rounded-lg border-2 border-white/70" />
              {engine === 'loading' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/80">
                  Motor betöltése…
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMode('photo')}
              className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
            >
              Nem indul a kamera? Olvasás fotóval
            </button>
          </>
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
                disabled={decoding || engine === 'loading'}
                onChange={handleFile}
              />
            </label>
          </div>
        )}
      </div>

      {mode === 'live' && (
        <p className="px-4 pb-6 text-center text-xs text-white/60">
          Irányítsd a kamerát a vonalkódra vagy QR kódra.
        </p>
      )}
    </div>
  )
}
