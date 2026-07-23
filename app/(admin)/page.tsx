import { createClient } from '@/lib/supabase/server'
import { SELEJT_OK_LABEL, type SelejtOk } from '@/lib/stock'

type DashboardData = {
  keszletertek: number
  keszlet_helyenkent: { teljes_kod: string; ertek: number }[]
  puffer_db: number
  puffer_tetel: number
  kigyujtve_db: number
  kigyujtve_tetel: number
  alacsony_keszlet: { nev: string; keszlet: number; min_keszlet: number }[]
  top_termekek: { nev: string; eladott_db: number }[]
  selejt: { ok: string; db: number }[]
  idosor: { nap: string; bevet_db: number; kiad_db: number }[]
}

const ft = (n: number) =>
  new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 }).format(
    Math.round(n)
  ) + ' Ft'

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  )
}

/** Vízszintes sávdiagram (top termékek, selejt). */
function HBars({
  rows,
  color,
  unit = 'db',
}: {
  rows: { label: string; value: number }[]
  color: string
  unit?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (rows.length === 0)
    return <p className="text-sm text-slate-400">Nincs adat.</p>
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex justify-between">
            <span className="truncate pr-2 text-slate-700">{r.label}</span>
            <span className="shrink-0 font-medium text-slate-900">
              {r.value} {unit}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** 30 napos bevét/kiadás oszlopdiagram. */
function TimeSeries({ data }: { data: DashboardData['idosor'] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.bevet_db, d.kiad_db)))
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[600px] items-end gap-1" style={{ height: 140 }}>
        {data.map((d) => (
          <div
            key={d.nap}
            className="flex flex-1 flex-col items-center justify-end gap-0.5"
            title={`${d.nap} · bevét ${d.bevet_db} · kiadás ${d.kiad_db}`}
          >
            <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 120 }}>
              <div
                className="w-1/2 rounded-t bg-emerald-400"
                style={{ height: `${(d.bevet_db / max) * 100}%` }}
              />
              <div
                className="w-1/2 rounded-t bg-slate-800"
                style={{ height: `${(d.kiad_db / max) * 100}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400">
              {d.nap.slice(8, 10)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Bevételezés
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-800" />
          Kiadás
        </span>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('dashboard_data')
  const d = (data ?? null) as DashboardData | null

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Áttekintés a raktári logisztikáról.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">Hiba: {error.message}</p>}

      {d && (
        <div className="mt-6 flex flex-col gap-4">
          {/* KPI-k */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Kpi label="Készletérték (beszerzési)" value={ft(d.keszletertek)} />
            <Kpi
              label="Pufferben"
              value={`${d.puffer_db} db`}
              sub={`${d.puffer_tetel} tétel betárolásra vár`}
            />
            <Kpi
              label="Kigyűjtve"
              value={`${d.kigyujtve_db} db`}
              sub={`${d.kigyujtve_tetel} tétel kiadásra vár`}
            />
          </div>

          {/* Idősor */}
          <Card title="Bevételezés vs. kiadás – utolsó 30 nap (db)">
            <TimeSeries data={d.idosor} />
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card title="Top termékek – eladás szerint">
              <HBars
                rows={d.top_termekek.map((t) => ({
                  label: t.nev,
                  value: t.eladott_db,
                }))}
                color="#0f172a"
              />
            </Card>

            <Card title="Selejt / veszteség – ok szerint">
              <HBars
                rows={d.selejt.map((s) => ({
                  label: SELEJT_OK_LABEL[s.ok as SelejtOk] ?? s.ok,
                  value: s.db,
                }))}
                color="#dc2626"
              />
            </Card>

            <Card title="Alacsony készlet (riasztás)">
              {d.alacsony_keszlet.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nincs a minimum alá csökkent termék.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {d.alacsony_keszlet.map((a) => (
                    <li
                      key={a.nev}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate text-slate-700">{a.nev}</span>
                      <span className="shrink-0 font-medium text-red-600">
                        {a.keszlet} / {a.min_keszlet} db
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Készletérték tárhelyenként">
              {d.keszlet_helyenkent.length === 0 ? (
                <p className="text-sm text-slate-400">Nincs betárolt készlet.</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {d.keszlet_helyenkent.map((h) => (
                    <li
                      key={h.teljes_kod}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-slate-700">
                        {h.teljes_kod}
                      </span>
                      <span className="shrink-0 font-medium text-slate-900">
                        {ft(h.ertek)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
