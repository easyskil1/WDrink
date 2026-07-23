'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

/**
 * Közös vonalkód/QR olvasó. Kamerát nyit, és az első sikeres beolvasáskor
 * meghívja az onResult-ot a dekódolt szöveggel. QR + EAN/Code128 stb.
 *
 * Megjegyzés: a kamera HTTPS-t vagy localhost-ot igényel.
 */
export function Scanner({
  onResult,
  onClose,
}: {
  onResult: (text: string) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    // A kamera (getUserMedia) csak biztonságos kontextusban érhető el:
    // HTTPS vagy localhost. HTTP-n (pl. telefonról a gép LAN IP-jén) a
    // navigator.mediaDevices undefined – adjunk érthető üzenetet nyers hiba
    // helyett.
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      const ua = navigator.userAgent || ''
      const isIOS = /iPhone|iPad|iPod/.test(ua)
      // iOS-en minden böngésző WebKit; a getUserMedia gyakran csak Safariban
      // érhető el. A Chrome for iOS UA-ban 'CriOS', a Firefox 'FxiOS'.
      const isIOSNonSafari = isIOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)

      setError(
        isIOSNonSafari
          ? 'iPhone-on a kamerás beolvasás Safariban működik. Nyisd meg ezt az oldalt Safariban (ne Chrome/Firefox-ban), és engedélyezd a kamerát.'
          : window.isSecureContext === false
            ? 'A kamera csak biztonságos kapcsolaton (HTTPS) vagy localhoston érhető el. Nyisd meg az oldalt https-en (a Vercel-linken), ne a gép IP-címén http-vel.'
            : 'Ez a böngésző nem támogatja a kamerát, vagy le van tiltva. Próbáld Safariban/Chrome-ban, és engedélyezd a kamerát.'
      )
      return
    }

    const reader = new BrowserMultiFormatReader()

    async function start() {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          videoRef.current!,
          (result, _err, controls) => {
            if (result && !cancelled) {
              controls.stop()
              onResult(result.getText())
            }
          }
        )
        if (cancelled) controls.stop()
        else controlsRef.current = controls
      } catch (e) {
        setError(
          e instanceof Error
            ? 'Kamera hiba: ' + e.message
            : 'A kamera nem érhető el.'
        )
      }
    }
    start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [onResult])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm font-medium">Beolvasás…</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          Bezárás
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        {error ? (
          <p className="max-w-xs text-center text-sm text-red-300">{error}</p>
        ) : (
          <div className="relative w-full max-w-md">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 m-8 rounded-lg border-2 border-white/70" />
          </div>
        )}
      </div>

      <p className="px-4 pb-6 text-center text-xs text-white/60">
        Irányítsd a kamerát a vonalkódra vagy QR kódra.
      </p>
    </div>
  )
}
