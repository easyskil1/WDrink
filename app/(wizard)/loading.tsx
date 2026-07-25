// Wizard skeleton: teljes képernyős, egyszerű töltésjelző, amíg a lépés
// szerveroldali adatai (készlet/helyek) betöltenek.
export default function Loading() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6"
      aria-busy="true"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500" />
      <p className="text-sm text-slate-400">Betöltés…</p>
    </div>
  )
}
