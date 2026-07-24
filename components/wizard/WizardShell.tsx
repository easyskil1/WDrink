'use client'

import type { ReactNode } from 'react'

/**
 * Közös wizard-keret (mobil-first, teljes képernyő).
 *
 * Elrendezés: fejléc (cím + Mégse) · egy-lépés törzs · lábléc (akciók).
 * A terv szabályai szerint:
 *  - Egy képernyő = egy lépés, nagy gombok.
 *  - Minden lépésen: Vissza | Selejt | Tovább.
 *  - Külön Mégse gomb: megszakít, nincs piszkozat-mentés.
 *  - Nincs progress-jelző.
 *
 * A záró (összegzés) lépésnél a standard akciók helyett add meg a `footer`
 * propot (pl. „Új … indítása” gomb), az felülírja az alap gombsort.
 */
export function WizardShell({
  title,
  onCancel,
  onBack,
  onScrap,
  onNext,
  nextLabel = 'Tovább',
  footer,
  children,
}: {
  title: string
  /** Mégse – megszakít, vissza a főoldali kártyaválasztóra. */
  onCancel: () => void
  /** Előző lépés. Ha nincs megadva, a Vissza gomb letiltva (1. lépésen). */
  onBack?: () => void
  /** Selejt akció az adott lépésen. Ha nincs megadva, a gomb rejtve. */
  onScrap?: () => void
  /** Tovább. Ha nincs megadva, a gomb letiltva (hiányos adat). */
  onNext?: () => void
  nextLabel?: string
  /** Egyéni lábléc – felülírja az alap Vissza|Selejt|Tovább sort. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-50">
      {/* Fejléc */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <h1 className="min-w-0 truncate text-base font-semibold text-slate-900">
          {title}
        </h1>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100"
        >
          Mégse
        </button>
      </header>

      {/* Lépés törzse */}
      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex h-full max-w-md flex-col">{children}</div>
      </main>

      {/* Lábléc */}
      <footer
        className="shrink-0 border-t border-slate-200 bg-white px-4 py-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {footer ?? (
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              disabled={!onBack}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition enabled:hover:bg-slate-50 disabled:opacity-40"
            >
              Vissza
            </button>
            {onScrap && (
              <button
                type="button"
                onClick={onScrap}
                className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                Selejt
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className="ml-auto flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition enabled:hover:bg-slate-800 disabled:opacity-40"
            >
              {nextLabel}
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
