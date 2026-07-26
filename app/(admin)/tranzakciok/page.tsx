import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  MOVEMENT_TIPUS_LABEL,
  MOVEMENT_TIPUS_COLOR,
  MOVEMENT_TIPUS_OPTIONS,
  SELEJT_OK_LABEL,
  type MovementTipus,
  type SelejtOk,
} from '@/lib/stock'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'

const PAGE_SIZE = 100

type SearchParams = Promise<{
  tipus?: string
  tol?: string
  ig?: string
  q?: string
  oldal?: string
}>

type Row = {
  id: string
  tipus: MovementTipus
  mennyiseg: number
  selejt_ok: SelejtOk | null
  megjegyzes: string | null
  created_at: string
  user_id: string | null
  profiles: { nev: string | null } | null
  forras: { teljes_kod: string } | null
  cel: { teljes_kod: string } | null
  stock_items: {
    lot_szam: string | null
    products: { nev: string; jovedeki: boolean } | null
    product_units: { kiszereles: KiszerelesTipus } | null
  } | null
}

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const oldal = Math.max(1, Number.parseInt(sp.oldal ?? '1', 10) || 1)
  const from = (oldal - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('movement_log')
    .select(
      `id, tipus, mennyiseg, selejt_ok, megjegyzes, created_at, user_id,
       profiles!movement_log_user_id_profiles_fkey(nev),
       forras:locations!forras_location_id(teljes_kod),
       cel:locations!cel_location_id(teljes_kod),
       stock_items(lot_szam, products(nev, jovedeki), product_units(kiszereles))`,
      // 'estimated': nagy táblán a planner-becslést használja (kis táblán pontos),
      // így nem fut teljes COUNT(*) minden betöltéskor. A lapozó UI-hoz elég.
      { count: 'estimated' }
    )
    .order('created_at', { ascending: false })

  if (sp.tipus && sp.tipus in MOVEMENT_TIPUS_LABEL) {
    query = query.eq('tipus', sp.tipus)
  }
  if (sp.tol) query = query.gte('created_at', sp.tol)
  if (sp.ig) {
    // A "ig" napot bezárólag: a nap végéig.
    query = query.lte('created_at', `${sp.ig}T23:59:59`)
  }

  // Termeknev szerinti szures: eloszor a talalo stock_item_id-k.
  const q = sp.q?.trim()
  if (q) {
    const { data: prodMatches } = await supabase
      .from('products')
      .select('id')
      .ilike('nev', `%${q}%`)
    const prodIds = (prodMatches ?? []).map((r) => r.id)
    if (prodIds.length > 0) {
      const { data: siMatches } = await supabase
        .from('stock_items')
        .select('id')
        .in('product_id', prodIds)
      const siIds = (siMatches ?? []).map((r) => r.id)
      query = query.in('stock_item_id', siIds.length > 0 ? siIds : [
        '00000000-0000-0000-0000-000000000000',
      ])
    } else {
      query = query.in('stock_item_id', [
        '00000000-0000-0000-0000-000000000000',
      ])
    }
  }

  const { data, error, count } = await query.range(from, to)
  const rows = (data ?? []) as unknown as Row[]

  // A felhasznalonev a fo selectbol jon (profiles embed a
  // movement_log_user_id_profiles_fkey menten) - nincs kulon lekerdezes.

  const total = count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const input =
    'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500'
  const th =
    'whitespace-nowrap border-b border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
  const td = 'whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700'

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.tipus) params.set('tipus', sp.tipus)
    if (sp.tol) params.set('tol', sp.tol)
    if (sp.ig) params.set('ig', sp.ig)
    if (sp.q) params.set('q', sp.q)
    if (p > 1) params.set('oldal', String(p))
    const qs = params.toString()
    return qs ? `/tranzakciok?${qs}` : '/tranzakciok'
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Tranzakciók</h1>
        <p className="mt-1 text-sm text-slate-500">
          {total} tranzakció · {oldal}/{lastPage}. oldal
        </p>
      </div>

      {/* Szűrő */}
      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Típus
          <select name="tipus" defaultValue={sp.tipus ?? ''} className={input}>
            <option value="">Mind</option>
            {MOVEMENT_TIPUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Dátumtól
          <input type="date" name="tol" defaultValue={sp.tol ?? ''} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Dátumig
          <input type="date" name="ig" defaultValue={sp.ig ?? ''} className={input} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-slate-600">
          Termék keresése
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="pl. Soproni…"
            className={`${input} min-w-0`}
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Szűrés
        </button>
        <Link
          href="/tranzakciok"
          className="px-2 py-2 text-sm text-slate-500 hover:underline"
        >
          Törlés
        </Link>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">Hiba: {error.message}</p>}

      {/* Excel-szerű táblázat */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Dátum / idő</th>
              <th className={th}>Típus</th>
              <th className={th}>Termék</th>
              <th className={th}>Kiszerelés</th>
              <th className={`${th} text-right`}>Menny. (db)</th>
              <th className={th}>LOT</th>
              <th className={th}>Forrás hely</th>
              <th className={th}>Cél hely</th>
              <th className={th}>Selejt ok</th>
              <th className={th}>Felhasználó</th>
              <th className={th}>Megjegyzés</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                  Nincs a szűrésnek megfelelő tranzakció.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const si = r.stock_items
              return (
                <tr key={r.id} className="odd:bg-white even:bg-slate-50/50">
                  <td className={`${td} tabular-nums`}>{dt(r.created_at)}</td>
                  <td className={td}>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${MOVEMENT_TIPUS_COLOR[r.tipus]}`}
                    >
                      {MOVEMENT_TIPUS_LABEL[r.tipus]}
                    </span>
                  </td>
                  <td className={`${td} font-medium text-slate-900`}>
                    {si?.products?.nev ?? '-'}
                    {si?.products?.jovedeki && (
                      <span className="ml-1 text-xs text-amber-700">(jöv.)</span>
                    )}
                  </td>
                  <td className={td}>
                    {si?.product_units
                      ? KISZERELES_LABEL[si.product_units.kiszereles]
                      : '-'}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{r.mennyiseg}</td>
                  <td className={td}>{si?.lot_szam ?? '-'}</td>
                  <td className={`${td} tabular-nums`}>{r.forras?.teljes_kod ?? '-'}</td>
                  <td className={`${td} tabular-nums`}>{r.cel?.teljes_kod ?? '-'}</td>
                  <td className={td}>
                    {r.selejt_ok ? SELEJT_OK_LABEL[r.selejt_ok] : '-'}
                  </td>
                  <td className={td}>{r.profiles?.nev ?? '-'}</td>
                  <td className={`${td} max-w-xs truncate`} title={r.megjegyzes ?? ''}>
                    {r.megjegyzes ?? '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Lapozás */}
      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          {oldal > 1 ? (
            <Link
              href={pageHref(oldal - 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Előző
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300">
              ← Előző
            </span>
          )}
          <span className="text-sm text-slate-500">
            {oldal}. / {lastPage}. oldal
          </span>
          {oldal < lastPage ? (
            <Link
              href={pageHref(oldal + 1)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Következő →
            </Link>
          ) : (
            <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300">
              Következő →
            </span>
          )}
        </div>
      )}
    </div>
  )
}
