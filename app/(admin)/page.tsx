import Link from 'next/link'

/**
 * Főoldal - kártyás munkaválasztó (mobil-first).
 *
 * Ez a napi munkafolyamatok gyors belépési pontja: 6 nagy kártya, mindegyik
 * egy modul wizard-flow-jának 1. lépésére navigál (`/munka/...`). A klasszikus,
 * görgethető adminoldalak változatlanul elérhetők az oldalsáv menüből.
 */

type WorkCard = {
  href: string
  label: string
  icon: React.ReactNode
  /** Akcentus háttér (ikon-buborék). */
  accent: string
}

const iconProps = {
  width: 30,
  height: 30,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const CARDS: WorkCard[] = [
  {
    href: '/munka/bevetelezes',
    label: 'Bevételezés',
    accent: 'bg-emerald-50 text-emerald-600',
    icon: (
      <svg {...iconProps}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
  {
    href: '/munka/betarolas',
    label: 'Betárolás',
    accent: 'bg-sky-50 text-sky-600',
    icon: (
      <svg {...iconProps}>
        <path d="M3 7l9-4 9 4-9 4-9-4Z" />
        <path d="M3 7v10l9 4 9-4V7" />
        <path d="M12 11v10" />
      </svg>
    ),
  },
  {
    href: '/munka/atrarolas',
    label: 'Átrárolás',
    accent: 'bg-violet-50 text-violet-600',
    icon: (
      <svg {...iconProps}>
        <path d="M17 3l4 4-4 4" />
        <path d="M21 7H7" />
        <path d="M7 21l-4-4 4-4" />
        <path d="M3 17h14" />
      </svg>
    ),
  },
  {
    href: '/munka/osszekeszites',
    label: 'Összekészítés',
    accent: 'bg-amber-50 text-amber-600',
    icon: (
      <svg {...iconProps}>
        <path d="M5 7h14l-1 13H6L5 7Z" />
        <path d="M9 7V5a3 3 0 0 1 6 0v2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/munka/kiszallitas',
    label: 'Kiszállítás',
    accent: 'bg-orange-50 text-orange-600',
    icon: (
      <svg {...iconProps}>
        <path d="M1 5h13v10H1z" />
        <path d="M14 8h4l3 3v4h-7V8Z" />
        <circle cx="5.5" cy="17.5" r="1.8" />
        <circle cx="17.5" cy="17.5" r="1.8" />
      </svg>
    ),
  },
  {
    href: '/munka/selejtezes',
    label: 'Selejtezés',
    accent: 'bg-rose-50 text-rose-600',
    icon: (
      <svg {...iconProps}>
        <path d="M4 7h16" />
        <path d="M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </svg>
    ),
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-slate-900">Munkaválasztó</h1>
      <p className="mt-1 text-sm text-slate-500">
        Válaszd ki a folyamatot. A klasszikus oldalak a menüből elérhetők.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex aspect-square min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-center transition active:scale-[0.98] hover:border-slate-300 hover:shadow-sm"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.accent}`}
            >
              {card.icon}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              {card.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
