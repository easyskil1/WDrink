// Tranzakciók skeleton: fejléc + szűrősor + táblázat-váz.
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse" aria-busy="true">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-48 rounded bg-slate-100" />

      {/* Szűrősor */}
      <div className="mt-6 h-20 rounded-xl border border-slate-200 bg-white" />

      {/* Táblázat */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="h-10 border-b border-slate-200 bg-slate-50" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-9 border-b border-slate-100" />
        ))}
      </div>
    </div>
  )
}
