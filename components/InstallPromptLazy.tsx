'use client'

import dynamic from 'next/dynamic'

// Az InstallPrompt (PWA telepítő banner) minden oldalon jelen van, de nincs
// SSR-értéke (csak böngésző-eseményekre reagál). Külön, aszinkron betöltött
// chunkba tesszük (ssr:false), hogy ne terhelje a kezdeti bundle-t/hidratálást.
const InstallPrompt = dynamic(
  () => import('./InstallPrompt').then((m) => m.InstallPrompt),
  { ssr: false }
)

export function InstallPromptLazy() {
  return <InstallPrompt />
}
