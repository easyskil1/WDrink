'use client'

import { useEffect } from 'react'

/**
 * A `/sw.js` service worker regisztrálása – ez a feltétele a teljes PWA-
 * viselkedésnek (Android telepíthetőség + offline fallback). Csak production
 * buildben regisztrálunk, hogy fejlesztés közben ne cache-eljen zavaróan.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // A regisztráció bukása ne törje meg az appot (pl. privát mód).
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}
