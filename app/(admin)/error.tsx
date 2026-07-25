'use client'

// Admin hibakezelő: ha egy oldal szerveroldali lekérdezése elszáll (pl. Supabase
// hiba), visszaállítható boundary jelenik meg a globális hibaoldal helyett.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">
          Hiba történt az oldal betöltésekor
        </h2>
        <p className="mt-2 text-sm text-red-700">
          {error.message || 'Ismeretlen hiba.'}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={reset}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
          >
            Újrapróbálom
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            Oldal újratöltése
          </button>
        </div>
      </div>
    </div>
  )
}
