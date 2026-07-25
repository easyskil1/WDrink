// Általános admin skeleton - azonnal megjelenik navigációkor, amíg az oldal
// szerveroldali lekérdezései lefutnak (nem üres képernyő).
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse" aria-busy="true">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="mt-2 h-4 w-32 rounded bg-slate-100" />

      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    </div>
  )
}
