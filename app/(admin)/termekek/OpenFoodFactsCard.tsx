'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { addProductFromOFF, type OffProductInput } from './actions'

/** Egy OFF-találat a saját mezőinkre leképezve. */
type OffResult = {
  code: string
  nev: string
  brand: string | null
  quantity: string | null
  alkoholtartalom: number | null
  image: string | null
  netto_urtartalom: number | null
  urtartalom_egyseg: 'ml' | 'l' | null
}

type Status =
  | { kind: 'adding' }
  | { kind: 'added'; id: string }
  | { kind: 'exists'; id?: string; msg: string }
  | { kind: 'error'; msg: string }

const OFF_FIELDS =
  'code,product_name,product_name_hu,generic_name,brands,quantity,nutriments,image_small_url'

/** "0,5 l" / "500 ml" / "33 cl" / "1L" → { value, egyseg } a mi egységeinkre normálva. */
function parseQuantity(
  q: unknown
): { value: number; egyseg: 'ml' | 'l' } | null {
  const s = String(q ?? '').trim().toLowerCase()
  const m = s.match(/([\d]+(?:[.,]\d+)?)\s*(ml|cl|dl|l|liter|litre)\b/)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  switch (m[2]) {
    case 'ml':
      return { value: n, egyseg: 'ml' }
    case 'cl':
      return { value: n * 10, egyseg: 'ml' }
    case 'dl':
      return { value: n * 100, egyseg: 'ml' }
    default:
      return { value: n, egyseg: 'l' } // l / liter / litre
  }
}

function extractAlcohol(nutriments: unknown): number | null {
  const n = nutriments as Record<string, unknown> | null | undefined
  if (!n) return null
  const raw = n['alcohol_value'] ?? n['alcohol_100g'] ?? n['alcohol']
  const v = Number(raw)
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Nyers OFF product → OffResult (null, ha nincs kódja). */
function mapProduct(p: Record<string, unknown>): OffResult | null {
  const code = String(p.code ?? '').trim()
  if (!code) return null
  const nev =
    String(p.product_name_hu ?? '').trim() ||
    String(p.product_name ?? '').trim() ||
    String(p.generic_name ?? '').trim() ||
    '(névtelen termék)'
  const quantity = String(p.quantity ?? '').trim() || null
  const parsed = parseQuantity(quantity)
  return {
    code,
    nev,
    brand: String(p.brands ?? '').trim() || null,
    quantity,
    alkoholtartalom: extractAlcohol(p.nutriments),
    image: String(p.image_small_url ?? '').trim() || null,
    netto_urtartalom: parsed?.value ?? null,
    urtartalom_egyseg: parsed?.egyseg ?? null,
  }
}

export default function OpenFoodFactsCard() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hungarianOnly, setHungarianOnly] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<OffResult[] | null>(null)
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [pending, startTransition] = useTransition()
  // A ténylegesen lekérdezett keresés (lapozáshoz), + oldal-infó.
  const [searched, setSearched] = useState<{ q: string; hu: boolean } | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [count, setCount] = useState(0)

  const PAGE_SIZE = 20

  async function runSearch(q: string, hu: boolean, pageNum: number) {
    setLoading(true)
    setError(null)
    setStatus({})
    try {
      // Magyar aldomain -> magyar nyelvű terméknevek; a világ-domain a globális.
      const host = hu ? 'hu.openfoodfacts.org' : 'world.openfoodfacts.org'
      const isBarcode = /^\d{6,14}$/.test(q)
      if (isBarcode) {
        const res = await fetch(
          `https://${host}/api/v2/product/${encodeURIComponent(
            q
          )}.json?fields=${OFF_FIELDS}`
        )
        const json = await res.json()
        const mapped =
          json.status === 1 && json.product ? mapProduct(json.product) : null
        setResults(mapped ? [mapped] : [])
        setCount(mapped ? 1 : 0)
        setPageCount(1)
        setPage(1)
      } else {
        // Névre keresésnél magyar módban ország-szűrő is (csak MO-n forgalmazott).
        const countryFilter = hu
          ? '&tagtype_0=countries&tag_contains_0=contains&tag_0=hungary'
          : ''
        const res = await fetch(
          `https://${host}/cgi/search.pl?search_terms=${encodeURIComponent(
            q
          )}&search_simple=1&action=process&json=1&page=${pageNum}&page_size=${PAGE_SIZE}&fields=${OFF_FIELDS}${countryFilter}`
        )
        const json = await res.json()
        const list: OffResult[] = Array.isArray(json.products)
          ? json.products
              .map((p: Record<string, unknown>) => mapProduct(p))
              .filter((r: OffResult | null): r is OffResult => r !== null)
          : []
        setResults(list)
        const total = Number(json.count) || 0
        setCount(total)
        setPageCount(Math.max(1, Math.ceil(total / PAGE_SIZE)))
        setPage(pageNum)
      }
    } catch {
      setError('Nem sikerült elérni az Open Food Facts adatbázist.')
    } finally {
      setLoading(false)
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setResults(null)
    setSearched({ q, hu: hungarianOnly })
    runSearch(q, hungarianOnly, 1)
  }

  function goToPage(p: number) {
    if (!searched || loading) return
    runSearch(searched.q, searched.hu, p)
  }

  function add(r: OffResult) {
    setStatus((s) => ({ ...s, [r.code]: { kind: 'adding' } }))
    const input: OffProductInput = {
      nev: r.nev,
      kategoria: r.brand,
      alkoholtartalom: r.alkoholtartalom,
      kep_url: r.image,
      vonalkod: r.code,
      netto_urtartalom: r.netto_urtartalom,
      urtartalom_egyseg: r.urtartalom_egyseg,
    }
    startTransition(async () => {
      const res = await addProductFromOFF(input)
      setStatus((s) => ({
        ...s,
        [r.code]: res.ok
          ? { kind: 'added', id: res.id }
          : res.existingProductId
            ? { kind: 'exists', id: res.existingProductId, msg: res.error }
            : { kind: 'error', msg: res.error },
      }))
    })
  }

  const input =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-col">
          <span className="text-base font-semibold text-slate-900">
            Keresés az Open Food Facts adatbázisban
          </span>
          <span className="text-xs text-slate-500">
            Vonalkód vagy név alapján, a találatot egy gombbal felveheted.
          </span>
        </span>
        <span
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="search"
              placeholder="pl. 5998200110016 vagy Coca-Cola"
              className={input}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? 'Keresés…' : 'Keresés'}
            </button>
          </form>

          <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={hungarianOnly}
              onChange={(e) => setHungarianOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Csak magyar termékek (magyar nevek, MO-n forgalmazott)
          </label>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {results && results.length === 0 && !loading && (
            <p className="mt-3 text-sm text-slate-400">
              Nincs találat az Open Food Facts-ben.
            </p>
          )}

          {results && results.length > 0 && count > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              {count} találat
              {pageCount > 1 ? ` · ${page}. / ${pageCount} oldal` : ''}
            </p>
          )}

          {results && results.length > 0 && (
            <ul className="mt-2 flex flex-col gap-2">
              {results.map((r) => {
                const st = status[r.code]
                return (
                  <li
                    key={r.code}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-2"
                  >
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-300">
                        ?
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {r.nev}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {[
                          r.brand,
                          r.quantity,
                          r.alkoholtartalom != null
                            ? `${r.alkoholtartalom}% alk.`
                            : null,
                          r.code,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {st?.kind === 'added' ? (
                        <Link
                          href={`/termekek/${st.id}`}
                          className="text-sm font-medium text-emerald-600 hover:underline"
                        >
                          ✓ Felvéve, szerkeszt
                        </Link>
                      ) : st?.kind === 'exists' ? (
                        st.id ? (
                          <Link
                            href={`/termekek/${st.id}`}
                            className="text-xs font-medium text-amber-600 hover:underline"
                          >
                            Már létezik, megnyit
                          </Link>
                        ) : (
                          <span className="text-xs text-amber-600">
                            {st.msg}
                          </span>
                        )
                      ) : st?.kind === 'error' ? (
                        <button
                          type="button"
                          onClick={() => add(r)}
                          className="text-xs font-medium text-red-600 hover:underline"
                          title={st.msg}
                        >
                          Hiba, újra
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => add(r)}
                          disabled={st?.kind === 'adding' || pending}
                          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {st?.kind === 'adding' ? 'Mentés…' : 'Hozzáad'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {results && pageCount > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Előző
              </button>
              <span className="text-sm text-slate-500">
                {page}. / {pageCount}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pageCount || loading}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Következő
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
