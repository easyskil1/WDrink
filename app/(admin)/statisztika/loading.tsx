// Statisztika skeleton: KPI-sor + kártyarács, a dashboard_data() lekérdezésig.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-64 rounded bg-slate-100" />

      <div className="mt-6 flex flex-col gap-4">
        {/* KPI-k */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>

        {/* Idősor */}
        <div className="h-48 rounded-xl border border-slate-200 bg-white" />

        {/* Kártyarács */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    </div>
  )
}
