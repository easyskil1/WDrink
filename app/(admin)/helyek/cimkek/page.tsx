import Link from 'next/link'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/server'
import { LOCATION_TIPUS_LABEL, type Location } from '@/lib/locations'
import { PrintButton } from './PrintButton'

type SearchParams = Promise<{ sor?: string; tipus?: string; aktiv?: string }>

async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  })
}

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('locations')
    .select('*')
    .order('teljes_kod', { ascending: true })

  if (sp.sor) query = query.ilike('sor', sp.sor)
  if (sp.tipus) query = query.eq('tipus', sp.tipus)
  if (sp.aktiv === 'aktiv') query = query.eq('aktiv', true)
  if (sp.aktiv === 'inaktiv') query = query.eq('aktiv', false)

  const { data } = await query
  const locations = (data ?? []) as Location[]

  const labels = await Promise.all(
    locations.map(async (loc) => ({
      loc,
      svg: await qrSvg(loc.qr_kod || loc.teljes_kod),
    }))
  )

  return (
    <div>
      {/* Vezérlők – nyomtatáskor elrejtve */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Címkék nyomtatása
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {labels.length} címke · A4 lapra, több címke egy oldalon
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/helyek"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Vissza
          </Link>
          <PrintButton />
        </div>
      </div>

      {labels.length === 0 ? (
        <p className="text-slate-400 print:hidden">
          Nincs nyomtatható tárhely a szűrésnek megfelelően.
        </p>
      ) : (
        <div className="labels-grid">
          {labels.map(({ loc, svg }) => (
            <div key={loc.id} className="label">
              <div
                className="label-qr"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="label-text">
                <div className="label-code">{loc.teljes_kod}</div>
                <div className="label-tipus">
                  {LOCATION_TIPUS_LABEL[loc.tipus]}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
