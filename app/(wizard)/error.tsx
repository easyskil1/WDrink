'use client'

// Wizard hibakezelő: teljes képernyős flow-knál is legyen visszaállítható
// boundary a globális hibaoldal helyett.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-red-800">Hiba történt</h2>
        <p className="mt-2 text-sm text-red-700">
          {error.message || 'Ismeretlen hiba.'}
        </p>
        <div className="mt-4 flex flex-col gap-2">
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
            Újratöltés
          </button>
        </div>
      </div>
    </div>
  )
}
