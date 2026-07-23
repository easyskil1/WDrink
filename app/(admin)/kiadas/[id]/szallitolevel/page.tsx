import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  JOVEDEKI_KATEGORIA_LABEL,
  KISZERELES_LABEL,
  type JovedekiKategoria,
  type KiszerelesTipus,
  type UrtartalomEgyseg,
} from '@/lib/products'
import { PrintButton } from './PrintButton'

type MovementRow = {
  mennyiseg: number
  stock_items: {
    lot_szam: string | null
    lejarat_datum: string | null
    products: {
      nev: string
      alkoholtartalom: number | null
      kn_kod: string | null
      jovedeki: boolean
      jovedeki_termekkategoria: JovedekiKategoria | null
    } | null
    product_units: {
      kiszereles: KiszerelesTipus
      netto_urtartalom: number | null
      urtartalom_egyseg: UrtartalomEgyseg | null
    } | null
  } | null
}

function literAssz(
  db: number,
  urt: number | null,
  egyseg: UrtartalomEgyseg | null
): number | null {
  if (!urt || !egyseg) return null
  const liter = egyseg === 'ml' ? urt / 1000 : urt
  return Math.round(db * liter * 1000) / 1000
}

export default async function SzallitolevelPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: note }, { data: company }, { data: moves }] = await Promise.all([
    supabase
      .from('delivery_notes')
      .select('sorszam, vevo_nev, datum, irany')
      .eq('id', id)
      .maybeSingle<{
        sorszam: string
        vevo_nev: string | null
        datum: string
        irany: string
      }>(),
    supabase
      .from('company_settings')
      .select('*')
      .eq('id', true)
      .maybeSingle<{
        cegnev: string | null
        adoszam: string | null
        cim: string | null
        jovedeki_engedelyszam: string | null
        felir_azonosito: string | null
      }>(),
    supabase
      .from('movement_log')
      .select(
        'mennyiseg, stock_items(lot_szam, lejarat_datum, products(nev, alkoholtartalom, kn_kod, jovedeki, jovedeki_termekkategoria), product_units(kiszereles, netto_urtartalom, urtartalom_egyseg))'
      )
      .eq('delivery_note_id', id)
      .eq('tipus', 'kiadas'),
  ])

  if (!note || note.irany !== 'kiadas') notFound()
  const rows = (moves ?? []) as unknown as MovementRow[]

  return (
    <div className="mx-auto max-w-3xl">
      {/* Vezérlők – nyomtatáskor elrejtve */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/kiadas" className="text-sm text-slate-500 hover:underline">
          ← Vissza a kiadáshoz
        </Link>
        <PrintButton />
      </div>

      {/* Bizonylat */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Szállítólevél</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sorszám: <span className="font-mono font-semibold">{note.sorszam}</span>
            </p>
            <p className="text-sm text-slate-500">Kelt: {note.datum}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-900">
              {company?.cegnev ?? 'Drink World Győr'}
            </p>
            {company?.cim && <p className="text-slate-600">{company.cim}</p>}
            {company?.adoszam && (
              <p className="text-slate-600">Adószám: {company.adoszam}</p>
            )}
            {company?.jovedeki_engedelyszam && (
              <p className="text-slate-600">
                Jövedéki eng.: {company.jovedeki_engedelyszam}
              </p>
            )}
            {company?.felir_azonosito && (
              <p className="text-slate-600">FELIR: {company.felir_azonosito}</p>
            )}
          </div>
        </div>

        {/* Vevő */}
        <div className="py-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Vevő</p>
          <p className="font-medium text-slate-900">{note.vevo_nev ?? '—'}</p>
        </div>

        {/* Tételek */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-slate-300 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-2">Termék</th>
                <th className="py-2 pr-2">Kiszerelés</th>
                <th className="py-2 pr-2">KN-kód</th>
                <th className="py-2 pr-2 text-right">Menny.</th>
                <th className="py-2 pr-2 text-right">Alk.%</th>
                <th className="py-2 text-right">Össz. liter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => {
                const p = r.stock_items?.products
                const u = r.stock_items?.product_units
                const liter = u
                  ? literAssz(r.mennyiseg, u.netto_urtartalom, u.urtartalom_egyseg)
                  : null
                return (
                  <tr key={i}>
                    <td className="py-2 pr-2 font-medium text-slate-900">
                      {p?.nev ?? '—'}
                      {p?.jovedeki && (
                        <span className="ml-1 text-xs text-amber-700">
                          ({p.jovedeki_termekkategoria
                            ? JOVEDEKI_KATEGORIA_LABEL[p.jovedeki_termekkategoria]
                            : 'jövedéki'})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-slate-600">
                      {u ? KISZERELES_LABEL[u.kiszereles] : '—'}
                    </td>
                    <td className="py-2 pr-2 text-slate-600">{p?.kn_kod ?? '—'}</td>
                    <td className="py-2 pr-2 text-right text-slate-900">
                      {r.mennyiseg} db
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600">
                      {p?.alkoholtartalom != null ? `${p.alkoholtartalom}%` : '—'}
                    </td>
                    <td className="py-2 text-right text-slate-600">
                      {liter != null ? `${liter} l` : '—'}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    Nincs tétel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Aláírások */}
        <div className="mt-10 flex justify-between gap-8 text-sm text-slate-500">
          <div className="flex-1 border-t border-slate-400 pt-1 text-center">
            Kiadó
          </div>
          <div className="flex-1 border-t border-slate-400 pt-1 text-center">
            Átvevő
          </div>
        </div>
      </div>
    </div>
  )
}
