'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'

/**
 * Közös vonalkód/QR olvasó. Két mód:
 *  - "live": folyamatos kamera-stream (getUserMedia) – asztali gépen és
 *    Androidon a legkényelmesebb.
 *  - "photo": natív fényképezés (<input capture>) + a képből dekódolás –
 *    iPhone-on (ahol a getUserMedia gyakran nem érhető el böngészőben) ez
 *    működik minden esetben. Ha az élő kamera nem indul, ide esünk vissza.
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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const [mode, setMode] = useState<'live' | 'photo'>('live')
  const [error, setError] = useState<string | null>(null)
  const [decoding, setDecoding] = useState(false)

  if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader()

  // Élő kamera indítása (csak live módban).
  useEffect(() => {
    if (mode !== 'live') return

    // Ha nincs getUserMedia (pl. iPhone böngésző, http kapcsolat), fotó-módra
    // váltunk – ott natív kamerával lehet beolvasni.
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setMode('photo')
      return
    }

    let cancelled = false
    const reader = readerRef.current!

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
      } catch {
        // Az élő kamera nem indult – fotó-móddal még mehet.
        if (!cancelled) setMode('photo')
      }
    }
    start()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [mode, onResult])

  // Fotóból dekódolás (photo mód).
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // ugyanaz a fájl újra kiválasztható legyen
    if (!file) return
    setDecoding(true)
    setError(null)
    const url = URL.createObjectURL(file)
    try {
      const result = await readerRef.current!.decodeFromImageUrl(url)
      onResult(result.getText())
    } catch {
      setError(
        'Nem sikerült vonalkódot felismerni a képen. Próbáld újra: közelebbről, éles, jól megvilágított képpel.'
      )
    } finally {
      URL.revokeObjectURL(url)
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
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="w-full rounded-lg bg-black"
                playsInline
              />
              <div className="pointer-events-none absolute inset-0 m-8 rounded-lg border-2 border-white/70" />
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
            {error && (
              <p className="text-sm text-red-300">{error}</p>
            )}
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
                disabled={decoding}
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
