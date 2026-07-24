import { requireStaff } from '@/lib/auth'

/**
 * Wizard route group layout – teljes képernyős, oldalsáv/fejléc nélkül.
 *
 * Ugyanaz az auth-védelem, mint az (admin) csoportban (requireStaff), de a
 * mobil wizard-flow-k maguk töltik ki a képernyőt: egy képernyő = egy lépés,
 * nincs admin-chrome, nincs görgetés.
 */
export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireStaff()
  return <div className="flex min-h-full flex-1 flex-col bg-slate-50">{children}</div>
}
