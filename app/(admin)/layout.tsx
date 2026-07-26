import { requireStaff } from '@/lib/auth'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireStaff()

  const displayName = profile?.nev || user.email

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block print:hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">
            Drink World Győr
          </p>
          <p className="text-xs text-slate-400">Logisztikai admin</p>
        </div>
        <Sidebar role={profile?.role ?? null} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 pb-3 sm:px-6 print:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        >
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            <MobileNav role={profile?.role ?? null} />
            <span className="truncate text-sm font-medium text-slate-700">
              Drink World Győr
            </span>
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-3">
            {/*
              `sm:block` (nem `sm:inline`): a truncate/min-w-0 inline elemre NEM
              hat (max-width, overflow:hidden, text-overflow nem érvényes rá),
              ezért a hosszú név eddig szélesítette a csoportot és kitolta a
              Kilépés gombot a fejlécből. A korábbi max-w-[40vw] is hibás mérték
              volt: a tartalmi sáv nem a teljes viewport (levonódik a sidebar).
            */}
            <span className="hidden min-w-0 truncate text-sm text-slate-600 sm:block">
              {displayName}
            </span>
            {profile?.role && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {profile.role}
              </span>
            )}
            {/* shrink-0: a Kilépés soha ne szoruljon össze és ne csússzon ki. */}
            <form action="/auth/signout" method="post" className="shrink-0">
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Kilépés
              </button>
            </form>
          </div>
        </header>

        <main
          className="flex-1 bg-slate-50 p-4 sm:p-6"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
