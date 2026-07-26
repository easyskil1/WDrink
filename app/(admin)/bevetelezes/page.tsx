import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSuppliers } from '@/lib/cached-data'

const PAGE_SIZE = 100

type SearchParams = Promise<{
  szl?: string
  beszallito?: string
  tol?: string
  ig?: string
  oldal?: string
}>

type NoteRow = {
  id: string
  sorszam: string
  szallitolevel_szam: string | null
  datum: string
  fenykep_url: string | null
  ekaer_szam: string | null
  suppliers: { nev: string } | null
}

/** Egy szállítólevélhez tartozó összesítés a movement_log-ból. */
type Aggr = { tetelek: number; db: number; selejt: number; korrekcio: number }

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

export default async function BevetelezesekPage({
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
    .from('delivery_notes')
    .select(
      'id, sorszam, szallitolevel_szam, datum, fenykep_url, ekaer_szam, suppliers(nev)',
      // 'estimated': nagy táblán planner-becslés, kis táblán pontos - nincs
      // teljes COUNT(*) minden betöltéskor (mint a Tranzakciók oldalon).
      { count: 'estimated' }
    )
    .eq('irany', 'bevetelezes')
    .order('datum', { ascending: false })
    .order('created_at', { ascending: false })

  const szl = sp.szl?.trim()
  if (szl) query = query.ilike('szallitolevel_szam', `%${szl}%`)
  if (sp.beszallito) query = query.eq('supplier_id', sp.beszallito)
  if (sp.tol) query = query.gte('datum', sp.tol)
  if (sp.ig) query = query.lte('datum', sp.ig)

  const [{ data, error, count }, suppliers] = await Promise.all([
    query.range(from, to),
    getSuppliers(),
  ])
  const notes = (data ?? []) as unknown as NoteRow[]

  // Összesítés: a tétel/darab számokat a movement_log adja (a stock_items-nek
  // nincs delivery_note_id-ja, a kapcsolat csak a naplón él). Egy lekérdezés az
  // oldalon látható levelekre, az aggregálás JS-ben - így nem kell új RPC.
  const aggr = new Map<string, Aggr>()
  if (notes.length > 0) {
    const { data: mlData } = await supabase
      .from('movement_log')
      .select('delivery_note_id, tipus, mennyiseg')
      .in(
        'delivery_note_id',
        notes.map((n) => n.id)
      )
    for (const m of (mlData ?? []) as {
      delivery_note_id: string | null
      tipus: string
      mennyiseg: number
    }[]) {
      if (!m.delivery_note_id) continue
      const a =
        aggr.get(m.delivery_note_id) ??
        { tetelek: 0, db: 0, selejt: 0, korrekcio: 0 }
      if (m.tipus === 'bevetelezes') {
        a.tetelek += 1
        a.db += m.mennyiseg
      } else if (m.tipus === 'selejtezes') {
        a.selejt += m.mennyiseg
      } else if (m.tipus === 'korrekcio') {
        a.korrekcio += 1
        a.db += m.mennyiseg // előjeles delta
      }
      aggr.set(m.delivery_note_id, a)
    }
  }

  const total = count ?? 0
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const input =
    'rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500'
  const th =
    'whitespace-nowrap border-b border-slate-300 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'
  const td = 'whitespace-nowrap border-b border-slate-100 px-3 py-2 text-slate-700'

  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (sp.szl) params.set('szl', sp.szl)
    if (sp.beszallito) params.set('beszallito', sp.beszallito)
    if (sp.tol) params.set('tol', sp.tol)
    if (sp.ig) params.set('ig', sp.ig)
    if (p > 1) params.set('oldal', String(p))
    const qs = params.toString()
    return qs ? `/bevetelezes?${qs}` : '/bevetelezes'
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bevételezések</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} szállítólevél · {oldal}/{lastPage}. oldal
          </p>
        </div>
        <Link
          href="/bevetelezes/uj"
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Új bevételezés
        </Link>
      </div>

      {/* Szűrő */}
      <form
        method="get"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Szállítólevél szám
          <input
            name="szl"
            defaultValue={sp.szl ?? ''}
            placeholder="pl. 12345"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
          Beszállító
          <select
            name="beszallito"
            defaultValue={sp.beszallito ?? ''}
            className={input}
          >
            <option value="">Mind</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nev}
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
        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-600"
        >
          Szűrés
        </button>
        <Link
          href="/bevetelezes"
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
              <th className={th}>Szállítólevél szám</th>
              <th className={th}>Beszállító</th>
              <th className={th}>Dátum</th>
              <th className={`${th} text-right`}>Tételek</th>
              <th className={`${th} text-right`}>Menny. (db)</th>
              <th className={`${th} text-right`}>Selejt (db)</th>
              <th className={`${th} text-right`}>Korrekció</th>
              <th className={th}>Fotó</th>
              <th className={th}>EKAER</th>
              <th className={th}>Belső azonosító</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {notes.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-slate-400">
                  Nincs a szűrésnek megfelelő szállítólevél.
                </td>
              </tr>
            )}
            {notes.map((n) => {
              const a = aggr.get(n.id)
              return (
                <tr key={n.id} className="odd:bg-white even:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>
                    <Link
                      href={`/bevetelezes/${n.id}`}
                      className="hover:underline"
                    >
                      {n.szallitolevel_szam ?? (
                        <span className="font-normal text-slate-400">-</span>
                      )}
                    </Link>
                  </td>
                  <td className={td}>{n.suppliers?.nev ?? '-'}</td>
                  <td className={`${td} tabular-nums`}>{dt(n.datum)}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {a?.tetelek ?? 0}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{a?.db ?? 0}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {a?.selejt ? (
                      <span className="text-red-600">{a.selejt}</span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {a?.korrekcio ? a.korrekcio : '-'}
                  </td>
                  <td className={td}>{n.fenykep_url ? 'van' : '-'}</td>
                  <td className={td}>{n.ekaer_szam ?? '-'}</td>
                  <td className={`${td} font-mono text-xs text-slate-400`}>
                    {n.sorszam}
                  </td>
                  <td className={td}>
                    <Link
                      href={`/bevetelezes/${n.id}`}
                      className="font-medium text-slate-600 hover:underline"
                    >
                      Megnyitás
                    </Link>
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
