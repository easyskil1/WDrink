// Figyelmeztetés, ha egy készletlista elérte a megjelenítési felső korlátot
// (nincs néma levágás). A limit a Cégadatok oldalon állítható.
export function ListLimitNotice({ limit }: { limit: number }) {
  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Csak az első <strong>{limit}</strong> tétel látszik (megjelenítési limit).
      Ha többet kell egyszerre látnod, növeld a limitet a Beállítások
      oldalon.
    </div>
  )
}
