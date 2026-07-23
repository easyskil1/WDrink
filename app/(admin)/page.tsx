export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Áttekintés a raktári logisztikáról. A modulok fokozatosan épülnek fel.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Raktári helyek', 'Tárhelyek, QR kódok, címkenyomtatás'],
          ['Termékek', 'Termékek és kiszerelési szintek'],
          ['Bevételezés / Betárolás', 'Áru fogadása és polcra helyezése'],
          ['Kigyűjtés / Kiadás', 'FEFO kigyűjtés, szállítólevél'],
          ['Átrárolás', 'Készlet mozgatása helyek között'],
          ['Selejtezés', 'Sérült / lejárt tételek kivezetése'],
        ].map(([title, desc]) => (
          <div
            key={title}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="font-medium text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
