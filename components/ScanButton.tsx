'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'

const Scanner = dynamic(() => import('./Scanner').then((m) => m.Scanner), {
  ssr: false,
})

/**
 * Kamera-ikonos gomb, ami megnyitja a Scanner-t, és a beolvasott szöveget
 * átadja az onScan-nek. Bármely vonalkód/QR beviteli mező mellé tehető.
 */
export function ScanButton({
  onScan,
  title = 'Beolvasás',
}: {
  onScan: (text: string) => void
  title?: string
}) {
  const [open, setOpen] = useState(false)

  const handle = useCallback(
    (text: string) => {
      onScan(text)
      setOpen(false)
    },
    [onScan]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={title}
        aria-label={title}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:bg-slate-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      </button>
      {open && <Scanner onResult={handle} onClose={() => setOpen(false)} />}
    </>
  )
}
