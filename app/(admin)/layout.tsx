import { requireStaff } from '@/lib/auth'
import { Sidebar } from './Sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile } = await requireStaff()

  const displayName = profile?.nev || user.email

  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">
            Drink World Győr
          </p>
          <p className="text-xs text-slate-400">Logisztikai admin</p>
        </div>
        <Sidebar role={profile?.role ?? null} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500 md:hidden">
            Drink World Győr
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-600">{displayName}</span>
            {profile?.role && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {profile.role}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Kilépés
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  )
}
