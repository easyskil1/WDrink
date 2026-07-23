'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import type { Supplier } from '@/lib/suppliers'
import {
  BETETDIJ_LABEL,
  JOVEDEKI_KATEGORIA_LABEL,
  KISZERELES_LABEL,
  labelOptions,
  type BetetdijTipus,
  type KiszerelesTipus,
  type Product,
  type ProductUnit,
  type UrtartalomEgyseg,
} from '@/lib/products'
import type { ProductFormState } from './actions'

type Action = (
  prev: ProductFormState,
  formData: FormData
) => Promise<ProductFormState>

// A kiszerelés-sor kontrollált (string) mezőkkel, hogy a beviteli élmény sima.
type UnitRow = {
  id?: string
  kiszereles: KiszerelesTipus
  vonalkod: string
  mennyiseg_alapegysegben: string
  netto_urtartalom: string
  urtartalom_egyseg: '' | UrtartalomEgyseg
  netto_ar: string
  brutto_ar: string
  afa_kulcs: string
  beszerzesi_ar: string
  betetdij_tipus: BetetdijTipus
  betetdij_osszeg: string
}

function emptyUnit(): UnitRow {
  return {
    kiszereles: 'palack',
    vonalkod: '',
    mennyiseg_alapegysegben: '1',
    netto_urtartalom: '',
    urtartalom_egyseg: '',
    netto_ar: '',
    brutto_ar: '',
    afa_kulcs: '27',
    beszerzesi_ar: '',
    betetdij_tipus: 'nincs',
    betetdij_osszeg: '',
  }
}

function toRow(u: ProductUnit): UnitRow {
  return {
    id: u.id,
    kiszereles: u.kiszereles,
    vonalkod: u.vonalkod ?? '',
    mennyiseg_alapegysegben: String(u.mennyiseg_alapegysegben),
    netto_urtartalom: u.netto_urtartalom?.toString() ?? '',
    urtartalom_egyseg: u.urtartalom_egyseg ?? '',
    netto_ar: u.netto_ar?.toString() ?? '',
    brutto_ar: u.brutto_ar?.toString() ?? '',
    afa_kulcs: u.afa_kulcs?.toString() ?? '27',
    beszerzesi_ar: u.beszerzesi_ar?.toString() ?? '',
    betetdij_tipus: u.betetdij_tipus,
    betetdij_osszeg: u.betetdij_osszeg?.toString() ?? '',
  }
}

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const label = 'flex flex-col gap-1 text-sm font-medium text-slate-700'
const fieldLabel = 'text-xs font-medium text-slate-500'

export function ProductForm({
  action,
  suppliers,
  initial,
  initialUnits,
  submitLabel,
}: {
  action: Action
  suppliers: Supplier[]
  initial?: Product
  initialUnits?: ProductUnit[]
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(action, {})

  const [jovedeki, setJovedeki] = useState(initial?.jovedeki ?? false)
  const [units, setUnits] = useState<UnitRow[]>(
    initialUnits && initialUnits.length > 0
      ? initialUnits.map(toRow)
      : [emptyUnit()]
  )

  function updateUnit(i: number, patch: Partial<UnitRow>) {
    setUnits((prev) => prev.map((u, idx) => (idx === i ? { ...u, ...patch } : u)))
  }
  function addUnit() {
    setUnits((prev) => [...prev, emptyUnit()])
  }
  function removeUnit(i: number) {
    setUnits((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* JSON payload a kiszerelésekhez */}
      <input type="hidden" name="units" value={JSON.stringify(units)} />

      {/* --- Alapadatok --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Alapadatok</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Név *
            <input name="nev" defaultValue={initial?.nev ?? ''} required className={input} />
          </label>
          <label className={label}>
            Kategória
            <input name="kategoria" defaultValue={initial?.kategoria ?? ''} className={input} />
          </label>
          <label className={label}>
            Beszállító
            <select
              name="gyarto_beszallito_id"
              defaultValue={initial?.gyarto_beszallito_id ?? ''}
              className={input}
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nev}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Alkoholtartalom (%)
            <input
              name="alkoholtartalom"
              type="number"
              step="0.01"
              inputMode="decimal"
              defaultValue={initial?.alkoholtartalom ?? ''}
              className={input}
            />
          </label>
          <label className={label}>
            Min. készlet (riasztás)
            <input
              name="min_keszlet"
              type="number"
              inputMode="numeric"
              defaultValue={initial?.min_keszlet ?? 0}
              className={input}
            />
          </label>
          <label className={`${label} sm:col-span-2`}>
            Leírás
            <textarea
              name="leiras"
              defaultValue={initial?.leiras ?? ''}
              rows={2}
              className={input}
            />
          </label>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="aktiv"
            defaultChecked={initial?.aktiv ?? true}
            className="h-4 w-4"
          />
          Aktív
        </label>
      </section>

      {/* --- Jövedéki --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">Jövedéki adatok</h2>
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="jovedeki"
            checked={jovedeki}
            onChange={(e) => setJovedeki(e.target.checked)}
            className="h-4 w-4"
          />
          Jövedéki termék
        </label>

        {jovedeki && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className={label}>
              Jövedéki kategória
              <select
                name="jovedeki_termekkategoria"
                defaultValue={initial?.jovedeki_termekkategoria ?? 'sor'}
                className={input}
              >
                {labelOptions(JOVEDEKI_KATEGORIA_LABEL).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={label}>
              KN-kód (vámtarifa)
              <input name="kn_kod" defaultValue={initial?.kn_kod ?? ''} className={input} />
            </label>
            <label className={label}>
              NAV fajtakód
              <input name="fajtakod" defaultValue={initial?.fajtakod ?? ''} className={input} />
            </label>
          </div>
        )}
      </section>

      {/* --- Kiszerelések --- */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            Kiszerelési szintek
          </h2>
          <button
            type="button"
            onClick={addUnit}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            + Kiszerelés
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {units.length === 0 && (
            <p className="text-sm text-slate-400">
              Nincs kiszerelés. Adj hozzá legalább egyet (palack/karton/…).
            </p>
          )}
          {units.map((u, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  {i + 1}. kiszerelés
                </span>
                <button
                  type="button"
                  onClick={() => removeUnit(i)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  Törlés
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Típus</span>
                  <select
                    value={u.kiszereles}
                    onChange={(e) =>
                      updateUnit(i, { kiszereles: e.target.value as KiszerelesTipus })
                    }
                    className={input}
                  >
                    {labelOptions(KISZERELES_LABEL).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                  <span className={fieldLabel}>Vonalkód (EAN)</span>
                  <input
                    value={u.vonalkod}
                    onChange={(e) => updateUnit(i, { vonalkod: e.target.value })}
                    inputMode="numeric"
                    placeholder="kézi bevitel"
                    className={input}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Menny. (alapegység)</span>
                  <input
                    value={u.mennyiseg_alapegysegben}
                    onChange={(e) =>
                      updateUnit(i, { mennyiseg_alapegysegben: e.target.value })
                    }
                    inputMode="numeric"
                    className={input}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Űrtartalom</span>
                  <div className="flex gap-1">
                    <input
                      value={u.netto_urtartalom}
                      onChange={(e) =>
                        updateUnit(i, { netto_urtartalom: e.target.value })
                      }
                      inputMode="decimal"
                      className={input}
                    />
                    <select
                      value={u.urtartalom_egyseg}
                      onChange={(e) =>
                        updateUnit(i, {
                          urtartalom_egyseg: e.target.value as '' | UrtartalomEgyseg,
                        })
                      }
                      className="rounded-md border border-slate-300 px-1 text-slate-900"
                    >
                      <option value="">—</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                    </select>
                  </div>
                </label>

                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Nettó ár</span>
                  <input
                    value={u.netto_ar}
                    onChange={(e) => updateUnit(i, { netto_ar: e.target.value })}
                    inputMode="decimal"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Bruttó ár</span>
                  <input
                    value={u.brutto_ar}
                    onChange={(e) => updateUnit(i, { brutto_ar: e.target.value })}
                    inputMode="decimal"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>ÁFA %</span>
                  <input
                    value={u.afa_kulcs}
                    onChange={(e) => updateUnit(i, { afa_kulcs: e.target.value })}
                    inputMode="decimal"
                    className={input}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Beszerzési ár</span>
                  <input
                    value={u.beszerzesi_ar}
                    onChange={(e) =>
                      updateUnit(i, { beszerzesi_ar: e.target.value })
                    }
                    inputMode="decimal"
                    className={input}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Betétdíj típus</span>
                  <select
                    value={u.betetdij_tipus}
                    onChange={(e) =>
                      updateUnit(i, {
                        betetdij_tipus: e.target.value as BetetdijTipus,
                      })
                    }
                    className={input}
                  >
                    {labelOptions(BETETDIJ_LABEL).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className={fieldLabel}>Betétdíj összeg</span>
                  <input
                    value={u.betetdij_osszeg}
                    onChange={(e) =>
                      updateUnit(i, { betetdij_osszeg: e.target.value })
                    }
                    inputMode="decimal"
                    className={input}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-5 py-2.5 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : submitLabel}
        </button>
        <Link
          href="/termekek"
          className="rounded-md border border-slate-300 px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Mégse
        </Link>
      </div>
    </form>
  )
}
