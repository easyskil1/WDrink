import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Location } from '@/lib/locations'
import { LocationForm } from '../LocationForm'
import { updateLocation } from '../actions'

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: location } = await supabase
    .from('locations')
    .select('*')
    .eq('id', id)
    .maybeSingle<Location>()

  if (!location) notFound()

  const action = updateLocation.bind(null, id)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">
            Tárhely szerkesztése
          </h1>
          {/* A morzsasor helyett itt jelenik meg, melyik tárhelyről van szó. */}
          <p className="mt-1 truncate font-mono text-sm text-slate-500">
            {location.teljes_kod}
          </p>
        </div>
        <Link
          href="/helyek"
          className="shrink-0 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Vissza
        </Link>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <LocationForm
          action={action}
          initial={location}
          submitLabel="Mentés"
        />
      </div>
    </div>
  )
}
