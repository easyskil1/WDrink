'use client'

import { useEffect, useState } from 'react'

/**
 * Egyszeri, elutasítható telepítési segédablak (PWA kezdőképernyőre adás).
 *
 * Platformfüggő útmutató:
 *  - iOS Safari: Megosztás → Főképernyőhöz adás (nincs automatikus prompt).
 *  - iOS más böngésző (Chrome/stb.): telepítés csak Safariban → átirányítjuk oda.
 *  - Android Chrome: ha van `beforeinstallprompt`, valódi „Telepítés” gomb;
 *    egyébként kézi útmutató (menü → Alkalmazás telepítése).
 *  - Asztali: címsor telepítés-ikon / menü.
 *
 * Megjelenés-vezérlés:
 *  - Ha az app már telepítve fut (standalone) → nem jelenik meg.
 *  - Minden oldalbetöltéskor felugrik (frissítés után is), amíg a felhasználó
 *    be nem pipálja a „Ne jelenjen meg többet” opciót.
 *  - „Ne jelenjen meg többet” pipa → tartós elrejtés (localStorage).
 */

type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop'

const HIDE_KEY = 'dw-install-hide'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIOS) {
    return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-other' : 'ios-safari'
  }
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="inline-block align-text-bottom">
    <path d="M12 3v13" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="inline-block align-text-bottom">
    <circle cx="12" cy="5" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="12" cy="19" r="1.6" />
  </svg>
)

export function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [dontShow, setDontShow] = useState(false)
  const [platform, setPlatform] = useState<Platform>('desktop')
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    if (localStorage.getItem(HIDE_KEY) === '1') return

    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', onBIP)

    const t = setTimeout(() => {
      setPlatform(detectPlatform())
      setVisible(true)
    }, 1500)
    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', onBIP)
    }
  }, [])

  function close() {
    // Csak akkor rejtjük el tartósan, ha a felhasználó bepipálta. Egyébként
    // oldalfrissítés után újra megjelenik (a munkamenet-őrt szándékosan nem
    // használjuk).
    if (dontShow) localStorage.setItem(HIDE_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice.catch(() => undefined)
    localStorage.setItem(HIDE_KEY, '1')
    setDeferred(null)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="3" />
                <path d="M11 18h2" />
              </svg>
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Tedd ki a kezdőképernyőre
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Bezárás"
            className="-mr-1 -mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-500">
          Így böngészősáv nélkül, teljes képernyőn, appszerűen nyílik, és a
          kameraengedélyt is megjegyzi a szkenneléshez.
        </p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          {platform === 'ios-safari' && (
            <ol className="flex flex-col gap-2">
              <li>
                1. Koppints alul a <b>Megosztás</b> ikonra (<ShareIcon />).
              </li>
              <li>
                2. Görgess le, és válaszd a <b>„Főképernyőhöz adás”</b> lehetőséget.
              </li>
              <li>3. Erősítsd meg a <b>„Hozzáadás”</b> gombbal.</li>
            </ol>
          )}

          {platform === 'ios-other' && (
            <div className="flex flex-col gap-2">
              <p>
                iPhone-on a telepítés (és az élő kamerás szkennelés) <b>csak
                Safariban</b> működik.
              </p>
              <ol className="flex flex-col gap-2">
                <li>1. Nyisd meg ezt az oldalt <b>Safariban</b>.</li>
                <li>
                  2. Ott: <b>Megosztás</b> (<ShareIcon />) →{' '}
                  <b>„Főképernyőhöz adás”</b>.
                </li>
              </ol>
            </div>
          )}

          {platform === 'android' && (
            <div className="flex flex-col gap-2">
              {deferred ? (
                <p>
                  Koppints lent a <b>Telepítés</b> gombra - a rendszer felteszi a
                  kezdőképernyőre.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  <li>
                    1. Nyisd meg a Chrome menüt jobb fent (<MenuIcon />).
                  </li>
                  <li>
                    2. Válaszd az <b>„Alkalmazás telepítése”</b> (vagy „Hozzáadás a
                    kezdőképernyőhöz”) lehetőséget.
                  </li>
                </ol>
              )}
            </div>
          )}

          {platform === 'desktop' && (
            <div className="flex flex-col gap-2">
              {deferred ? (
                <p>
                  Kattints lent a <b>Telepítés</b> gombra.
                </p>
              ) : (
                <p>
                  A címsor jobb szélén lévő <b>telepítés ikonra</b> kattints, vagy a
                  böngésző menüjében válaszd az <b>„Alkalmazás telepítése”</b>
                  lehetőséget.
                </p>
              )}
            </div>
          )}
        </div>

        <label className="mt-4 flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="h-4 w-4"
          />
          Ne jelenjen meg többet
        </label>

        <div className="mt-4 flex gap-2">
          {deferred && (platform === 'android' || platform === 'desktop') ? (
            <>
              <button
                type="button"
                onClick={close}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Később
              </button>
              <button
                type="button"
                onClick={install}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Telepítés
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={close}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Értem
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
