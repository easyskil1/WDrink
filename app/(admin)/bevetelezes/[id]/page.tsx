import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSuppliers } from '@/lib/cached-data'
import { SELEJT_OK_LABEL, STOCK_STATUSZ_LABEL, type SelejtOk, type StockStatusz } from '@/lib/stock'
import { KISZERELES_LABEL, type KiszerelesTipus } from '@/lib/products'
import { NoteHeaderForm } from './NoteHeaderForm'
import { TetelRow, type TetelData } from './TetelRow'

type Note = {
  id: string
  sorszam: string
  szallitolevel_szam: string | null
  datum: string
  ekaer_szam: string | null
  fenykep_url: string | null
  supplier_id: string | null
  irany: string
}

type BevMozgas = {
  id: string
  mennyiseg: number
  created_at: string
  stock_items: {
    id: string
    mennyiseg_alapegysegben: number
    lot_szam: string | null
    lejarat_datum: string | null
    statusz: StockStatusz
    products: { nev: string } | null
    product_units: {
      kiszereles: KiszerelesTipus
      mennyiseg_alapegysegben: number
    } | null
  } | null
}

type Korrekcio = {
  id: string
  stock_item_id: string | null
  mennyiseg: number
  megjegyzes: string | null
  created_at: string
}

type Selejt = {
  id: string
  mennyiseg: number
  selejt_ok: SelejtOk | null
  megjegyzes: string | null
  created_at: string
}

const dt = (iso: string) =>
  new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export default async function BevetelezesReszletPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: noteData } = await supabase
    .from('delivery_notes')
    .select(
      'id, sorszam, szallitolevel_szam, datum, ekaer_szam, fenykep_url, supplier_id, irany'
    )
    .eq('id', id)
    .maybeSingle<Note>()

  if (!noteData) notFound()
  // A kiadási szállítóleveleknek saját nézetük van (nyomtatható PDF).
  if (noteData.irany !== 'bevetelezes') notFound()

  const [{ data: bevData }, { data: korrData }, { data: selejtData }, suppliers] =
    await Promise.all([
      supabase
        .from('movement_log')
        .select(
          `id, mennyiseg, created_at,
           stock_items(id, mennyiseg_alapegysegben, lot_szam, lejarat_datum, statusz,
                       products(nev), product_units(kiszereles, mennyiseg_alapegysegben))`
        )
        .eq('delivery_note_id', id)
        .eq('tipus', 'bevetelezes')
        .order('created_at'),
      supabase
        .from('movement_log')
        .select('id, stock_item_id, mennyiseg, megjegyzes, created_at')
        .eq('delivery_note_id', id)
        .eq('tipus', 'korrekcio')
        .order('created_at'),
      supabase
        .from('movement_log')
        .select('id, mennyiseg, selejt_ok, megjegyzes, created_at')
        .eq('delivery_note_id', id)
        .eq('tipus', 'selejtezes')
        .order('created_at'),
      getSuppliers(),
    ])

  const bev = (bevData ?? []) as unknown as BevMozgas[]
  const korrekciok = (korrData ?? []) as unknown as Korrekcio[]
  const selejtek = (selejtData ?? []) as unknown as Selejt[]

  // Korrekciók tételhez rendelése (az előzmény a soron jelenik meg).
  const korrByItem = new Map<string, Korrekcio[]>()
  for (const k of korrekciok) {
    if (!k.stock_item_id) continue
    const arr = korrByItem.get(k.stock_item_id) ?? []
    arr.push(k)
    korrByItem.set(k.stock_item_id, arr)
  }

  const tetelek: TetelData[] = bev
    .filter((m) => m.stock_items)
    .map((m) => {
      const si = m.stock_items!
      const unitMult = si.product_units?.mennyiseg_alapegysegben ?? 1
      return {
        stock_item_id: si.id,
        termek: si.products?.nev ?? '(ismeretlen termék)',
        kiszereles: si.product_units
          ? KISZERELES_LABEL[si.product_units.kiszereles]
          : '-',
        unit_mult: unitMult,
        bevetelezett_db: m.mennyiseg,
        jelenlegi_db: si.mennyiseg_alapegysegben,
        lot_szam: si.lot_szam,
        lejarat_datum: si.lejarat_datum,
        statusz: si.statusz,
        statusz_label: STOCK_STATUSZ_LABEL[si.statusz],
        bevetelezve: m.created_at,
        korrekciok: (korrByItem.get(si.id) ?? []).map((k) => ({
          id: k.id,
          delta: k.mennyiseg,
          megjegyzes: k.megjegyzes,
          created_at: k.created_at,
        })),
      }
    })

  const osszDb = tetelek.reduce((s, t) => s + t.jelenlegi_db, 0)
  const selejtDb = selejtek.reduce((s, x) => s + x.mennyiseg, 0)

  return (
    <div className="mx-auto max-w-5xl">
      {/* Látható visszaút - a halvány morzsasort könnyű nem észrevenni. */}
      <Link
        href="/bevetelezes"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        ← Vissza a bevételezésekhez
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          {noteData.szallitolevel_szam ?? (
            <span className="text-slate-400">(nincs szállítólevél szám)</span>
          )}
        </h1>
        <p className="text-sm text-slate-500">
          {tetelek.length} tétel · {osszDb} db készleten
          {selejtDb > 0 && <> · {selejtDb} db selejt</>}
        </p>
        <p className="font-mono text-xs text-slate-400">
          Belső azonosító: {noteData.sorszam}
        </p>
      </div>

      {/* Fejléc szerkesztése - nem érinti a készletet. */}
      <section className="mt-6">
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          Szállítólevél adatai
        </h2>
        <NoteHeaderForm
          noteId={noteData.id}
          suppliers={suppliers}
          initial={{
            szallitolevel_szam: noteData.szallitolevel_szam ?? '',
            supplier_id: noteData.supplier_id ?? '',
            datum: noteData.datum,
            ekaer_szam: noteData.ekaer_szam ?? '',
          }}
          fenykepUrl={noteData.fenykep_url}
        />
      </section>

      {/* Tételek */}
      <section className="mt-8">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Tételek</h2>
        {tetelek.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
            Ehhez a szállítólevélhez nincs bevételezett tétel.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tetelek.map((t) => (
              <TetelRow key={t.stock_item_id} noteId={noteData.id} tetel={t} />
            ))}
          </ul>
        )}
      </section>

      {/* Bevételezéskori selejt - nincs hozzá stock_item, ezért csak napló. */}
      {selejtek.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-slate-900">
            Sérülten érkezett (selejt)
          </h2>
          <ul className="flex flex-col gap-2">
            {selejtek.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm"
              >
                <span className="font-medium text-red-800">
                  {s.mennyiseg} db ·{' '}
                  {s.selejt_ok ? SELEJT_OK_LABEL[s.selejt_ok] : 'ok nélkül'}
                </span>
                <span className="text-xs text-red-700">
                  {dt(s.created_at)}
                  {s.megjegyzes ? ` · ${s.megjegyzes}` : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            A bevételezéskor sérültnek jelölt áru nem került készletre, ezért itt
            csak naplóként szerepel - nincs hozzá javítható készlet-tétel.
          </p>
        </section>
      )}
    </div>
  )
}
