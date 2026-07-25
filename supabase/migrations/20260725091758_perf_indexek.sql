-- Teljesítmény-indexek (Feladatlista 2 / A fázis)
-- Csak indexek, séma/adat nem változik. A meglévő indexeket nem duplikálja
-- (if not exists). Migrációban futnak, ezért NINCS "concurrently"
-- (az tranzakción kívül futna, amit a migráció-runner nem enged).

-- A1: szállítólevél-nyomtatás gyakran szűr delivery_note_id-re (eddig index nélkül).
create index if not exists movement_log_delivery_note_idx
  on public.movement_log (delivery_note_id);

-- A2: készlet-munkalisták: statusz szerinti szűrés + rendezés egy indexből.
--     FEFO oldalak (kigyűjtés/összekészítés) lejarat_datum szerint rendeznek.
create index if not exists stock_items_statusz_lejarat_idx
  on public.stock_items (statusz, lejarat_datum nulls last);
--     Betárolás/kiadás/átrárolás/selejtezés created_at szerint rendez.
create index if not exists stock_items_statusz_created_idx
  on public.stock_items (statusz, created_at);

-- A3: beszállító-dropdownok és -lista név szerint rendeznek.
create index if not exists suppliers_nev_idx
  on public.suppliers (nev);

-- A4: aktív termékek szűrése (katalógus, bevételezés). Részleges index.
create index if not exists products_aktiv_idx
  on public.products (aktiv) where aktiv;
