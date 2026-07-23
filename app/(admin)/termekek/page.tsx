import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import type { Supplier } from '@/lib/suppliers'
import { toggleProductActive } from './actions'

type SearchParams = Promise<{
  q?: string
  beszallito?: string
  aktiv?: string
}>

type Row = {
  id: string
  nev: string
  kategoria: string | null
  jovedeki: boolean
  aktiv: boolean
  gyarto_beszallito_id: string | null
  product_units: {
    id: string
    kiszereles: KiszerelesTipus
    vonalkod: string | null
    brutto_ar: number | null
  }[]
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: supplierData } = await supabase
    .from('suppliers')
    .select('id, nev')
    .order('nev')
  const suppliers = (supplierData ?? []) as Pick<Supplier, 'id' | 'nev'>[]

  let query = supabase
    .from('products')
    .select(
      'id, nev, kategoria, jovedeki, aktiv, gyarto_beszallito_id, product_units(id, kiszereles, vonalkod, brutto_ar)'
    )
    .order('nev', { ascending: true })

  if (sp.beszallito) query = query.eq('gyarto_beszallito_id', sp.beszallito)
  if (sp.aktiv === 'aktiv') query = query.eq('aktiv', true)
  if (sp.aktiv === 'inaktiv') query = query.eq('aktiv', false)

  const q = sp.q?.trim()
  if (q) {
    // Vonalkód-egyezés a kiszereléseknél → product_id-k.
    const { data: unitMatches } = await supabase
      .from('product_units')
      .select('product_id')
      .ilike('vonalkod', `%${q}%`)
    const ids = [...new Set((unitMatches ?? []).map((r) => r.product_id))]

    const orParts = [`nev.ilike.%${q}%`, `kategoria.ilike.%${q}%`]
    if (ids.length > 0) orParts.push(`id.in.(${ids.join(',')})`)
    query = query.or(orParts.join(','))
  }

  const { data, error } = await query
  const products = (data ?? []) as Row[]

  const input =
    'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500'

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Termékek</h1>
          <p className="mt-1 text-sm text-slate-500">{products.length} termék</p>
        </div>
        <Link
          href="/termekek/uj"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Új termék
        </Link>
      </div>

      {/* Szűrő */}
      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          Keresés (név / kategória / vonalkód)
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="pl. Soproni vagy 599…"
            className={`${input} min-w-0`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Beszállító
          <select name="beszallito" defaultValue={sp.beszallito ?? ''} className={input}>
            <option value="">Mind</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nev}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Állapot
          <select name="aktiv" defaultValue={sp.aktiv ?? ''} className={input}>
            <option value="">Mind</option>
            <option value="aktiv">Aktív</option>
            <option value="inaktiv">Inaktív</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Szűrés
        </button>
        <Link href="/termekek" className="px-2 py-2 text-sm text-slate-500 hover:underline">
          Törlés
        </Link>
      </form>

      {error && (
        <p className="mt-4 text-sm text-red-600">Hiba: {error.message}</p>
      )}

      {/* Lista – kártyák (mobile-first) */}
      <ul className="mt-4 flex flex-col gap-3">
        {products.length === 0 && (
          <li className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            Nincs a szűrésnek megfelelő termék.
          </li>
        )}
        {products.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{p.nev}</span>
                {p.jovedeki && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    jövedéki
                  </span>
                )}
                {!p.aktiv && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    inaktív
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {p.kategoria ? p.kategoria + ' · ' : ''}
                {p.product_units.length > 0
                  ? p.product_units
                      .map((u) => KISZERELES_LABEL[u.kiszereles])
                      .join(', ')
                  : 'nincs kiszerelés'}
              </p>
            </div>
            <div className="flex shrink-0 gap-3">
              <Link
                href={`/termekek/${p.id}`}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Szerkeszt
              </Link>
              <form action={toggleProductActive.bind(null, p.id, !p.aktiv)}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  {p.aktiv ? 'Deaktivál' : 'Aktivál'}
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
