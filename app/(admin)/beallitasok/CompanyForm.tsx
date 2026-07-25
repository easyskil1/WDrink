'use client'

import { useActionState } from 'react'
import { updateCompanySettings, type CompanyFormState } from './actions'

export type CompanySettings = {
  cegnev: string | null
  adoszam: string | null
  cim: string | null
  jovedeki_engedelyszam: string | null
  felir_azonosito: string | null
  keszlet_lista_limit: number
}

const input =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const label = 'flex flex-col gap-1 text-sm font-medium text-slate-700'

export function CompanyForm({ initial }: { initial: CompanySettings | null }) {
  const [state, formAction, pending] = useActionState<CompanyFormState, FormData>(
    updateCompanySettings,
    {}
  )

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className={label}>
        Cégnév
        <input name="cegnev" defaultValue={initial?.cegnev ?? ''} className={input} />
      </label>
      <label className={label}>
        Adószám
        <input name="adoszam" defaultValue={initial?.adoszam ?? ''} className={input} />
      </label>
      <label className={label}>
        Cím
        <input name="cim" defaultValue={initial?.cim ?? ''} className={input} />
      </label>
      <label className={label}>
        Jövedéki engedélyszám
        <input
          name="jovedeki_engedelyszam"
          defaultValue={initial?.jovedeki_engedelyszam ?? ''}
          className={input}
        />
      </label>
      <label className={label}>
        FELIR azonosító
        <input
          name="felir_azonosito"
          defaultValue={initial?.felir_azonosito ?? ''}
          className={input}
        />
      </label>

      <label className={label}>
        Készletlisták max. megjelenített tétel
        <input
          type="number"
          name="keszlet_lista_limit"
          min={50}
          max={100000}
          step={50}
          defaultValue={initial?.keszlet_lista_limit ?? 500}
          className={input}
        />
        <span className="text-xs font-normal text-slate-500">
          A munkalisták (betárolás, kigyűjtés, kiszállítás, átrárolás, selejtezés)
          legfeljebb ennyi tételt töltenek be a gyorsaság érdekében. Ha egy lista
          eléri ezt a számot, figyelmeztetést mutat. Növeld, ha egyszerre több
          tételt kell látnod (nagyobb szám = lassabb betöltés).
        </span>
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Mentve.
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {pending ? 'Mentés…' : 'Mentés'}
        </button>
      </div>
    </form>
  )
}
