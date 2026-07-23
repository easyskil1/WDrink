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
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/helyek" className="hover:underline">
          Raktári helyek
        </Link>{' '}
        / {location.teljes_kod}
      </nav>
      <h1 className="text-2xl font-semibold text-slate-900">
        Tárhely szerkesztése
      </h1>

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
