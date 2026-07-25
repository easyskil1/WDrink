# WDrink – Teljesítmény-optimalizálási feladatlista (Feladatlista 2)

> Cél: az app gyorsítása anélkül, hogy a működés változna. A vizsgálat a teljes
> kódra kiterjedt (adatréteg / SQL, Next.js rendering + cache, kliens-bundle +
> assetek, middleware). Minden feladatnál ott a **fájl:sor** és a **konkrét fix**.
>
> Alapelvek amiket NEM bántunk (már jók): auth dedup `React.cache`-sel, lokális
> JWT-ellenőrzés (`getClaims`, nincs hálózati kör), Scanner + WASM code-split,
> `qrcode` csak szerveren, `next/font` self-hosted, middleware matcher.
>
> Régió: **✅ ellenőrizve, Frankfurt (`fra1`)** – a legnagyobb tétel megvan.
> Nincs polling / realtime / folyamatos frissítés: az adat csak lapbetöltéskor és
> felhasználói művelet után frissül.
>
> Jelölés: `[ ]` nyitott · `[x]` kész · **Hatás**: 🔴 nagy / 🟡 közepes / 🟢 kicsi
>
> **Migráció-alkalmazás:** a gépen elérhető `SUPABASE_ACCESS_TOKEN` (Management API) +
> project ref `qjpsvylskodxzoqklwsg`. Az új SQL migrációk közvetlenül futtathatók:
> `POST https://api.supabase.com/v1/projects/<ref>/database/query` (Bearer token),
> a repó `supabase/migrations/*.sql` fájljából (nincs copy-paste hiba).

---

## FÁZIS A – Adatbázis-indexek (SQL) 🔴

> Egyetlen új migrációba tehető, frontend-kód nem változik. A legjobb hatás/kockázat
> arány. Új fájl: `supabase/migrations/<timestamp>_perf_indexek.sql`.
>
> **STÁTUSZ: ✅ KÉSZ + ALKALMAZVA** (`supabase/migrations/20260725091758_perf_indexek.sql`,
> A1–A4 lefuttatva a Supabase-en dashboard SQL editorból, 2026-07-25). A5 kihagyva (kis tábla).

- [x] **A1** 🔴 Index a szállítólevél-nyomtatáshoz
  `create index movement_log_delivery_note_idx on public.movement_log (delivery_note_id);`
  Ok: `kiadas/[id]/szallitolevel/page.tsx:78` `delivery_note_id` szerint szűr, jelenleg index nélkül → teljes tábla-scan nyomtatásonként. (`init_schema.sql:240,247-249`)
- [ ] **A2** 🟡 Összetett indexek a készlet-munkalistákhoz (FEFO + rendezés):
  `create index stock_items_statusz_lejarat_idx on public.stock_items (statusz, lejarat_datum nulls last);`
  `create index stock_items_statusz_created_idx on public.stock_items (statusz, created_at);`
  Ok: `kigyujtes/page.tsx:32-34`, `osszekeszites:33-35`, `betarolas:33-35`, `kiadas:29-31`, `atrarolas:37-39`, `selejtezes:43-45` mind `statusz`-ra szűr + `created_at`/`lejarat_datum`-ra rendez; jelenleg csak külön indexek vannak. (`init_schema.sql:219-223`)
- [ ] **A3** 🟢 `create index suppliers_nev_idx on public.suppliers (nev);`
  Ok: több `.order('nev')` (`termekek/page.tsx:42`, `bevetelezes/page.tsx:18`, `termekek/uj:9`, `termekek/[id]:25`, `beszallitok:11`).
- [ ] **A4** 🟢 Részleges index az aktív termékekre:
  `create index products_aktiv_idx on public.products (aktiv) where aktiv;`
  Ok: `bevetelezes/page.tsx:24`, `termekek/page.tsx:53-54`.
- [ ] **A5** 🟢 (opcionális, csak ha a `locations` megnő) index `locations (tipus)` / `(aktiv)` a `helyek` szűrőkhöz (`helyek/page.tsx:25-28`).

---

## FÁZIS B – Statisztika / dashboard lassú lekérdezések 🔴

- [x] **B1+B2** 🔴 A beszállító- és vevő-rangsor átkerült a `dashboard_data()` RPC-be
  (top 10, `sum()/group by`). A `statisztika/page.tsx` már **egyetlen** RPC-hívást csinál;
  a két teljes `movement_log` lekérdezés és a JS `rangsor()` törölve. ✅ kód kész, tsc+eslint zöld.
  **Új migráció:** `supabase/migrations/20260725100000_dashboard_perf.sql` – ✅ **ALKALMAZVA** (Supabase Management API-n keresztül, 2026-07-25; ellenőrizve: az új kulcsok + dátumkorlát benne).
- [x] **B3** 🔴 `dashboard_data()` idősor alszűrői dátumkorlátot kaptak (`created_at >= current_date - interval '29 days'`).
  Ugyanabban a migrációban. ✅ alkalmazva.
- [ ] **B4** 🟡 `dashboard.sql:21-64` – 7 külön `stock_items` scan (keszletertek, puffer, kigyujtve stb.).
  Vond össze feltételes aggregációval. **ELVETVE**: a számlálók index-alapon gyorsak, egy scanbe vonva
  a nyereség marginális/bizonytalan, egy működő éles RPC átírásának kockázata nem éri meg.

---

## FÁZIS C – Tranzakciók oldal 🔴

- [x] **C1** 🔴 `tranzakciok/page.tsx` – `count:'exact'` → `count:'estimated'` (nagy táblán planner-becslés,
  kis táblán pontos; nincs teljes `COUNT(*)` minden betöltéskor). ✅ kész, tsc zöld.
- [ ] **C2** 🟡 `tranzakciok/page.tsx:112` – a `profiles` külön lekérdezés helyett join a fő
  selectbe (`profiles(nev)`), 1 körrel kevesebb. (Megj.: FK a `auth.users`-re megy, ellenőrizni kell az embed-elhetőséget; ha nem megy, marad a külön lekérdezés.)
- [ ] **C3** 🟡 `loading.tsx` a `tranzakciok` szegmensbe (lásd F fázis).

---

## FÁZIS D – Service worker / kliens-bundle / assetek 🔴🟡

- [x] **D1** 🔴 `public/sw.js` – az 1 MB-os `zxing_reader.wasm` kikerült a `PRECACHE`-ből;
  futásidejű cache-first szabály `.wasm`-ra (első valós használatkor cache-eli); `CACHE` verzió
  `dw-static-v1` → `dw-static-v2`, hogy a régi 1 MB-os precache aktiváláskor törlődjön. ✅ kész.
  **⚠️ `Scanner.tsx` / `ScanButton.tsx` / felismerő logika NEM változott. iOS-en tesztelni élesítés előtt (ott fut a WASM fallback).**
- [x] **D2** 🔴 Képoptimalizálás – `<img>` marad (a `kep_url` **szabad szöveges**, bármilyen host lehet,
  ezért a `next/image` allowlist futásidőben törne), de kapott `loading="lazy"` + `decoding="async"`
  + fix `width`/`height`: `termekek/page.tsx` (lista), `OpenFoodFactsCard.tsx` (találatok), `ProductForm.tsx` (előnézet).
  → lazy-load (soronként csak a látható képek) + nincs layout-ugrálás, minden hosttal. ✅
  **Megj.:** ha később minden termékkép Supabase storage-ba kerül (egységes host), érdemes visszatérni a `next/image` optimalizálóra.
- [x] **D3** 🟡 `InstallPrompt` külön, aszinkron chunkba (`components/InstallPromptLazy.tsx`,
  `next/dynamic` + `ssr:false`); a root layout ezt hívja. ✅
- [x] **D4** 🟡 supabase-js kivéve a kezdeti kliens-bundle-ből: a 3 komponens
  (`BevetelezesWizard`, `SelejtezesList`, `BevetelezesForm`) a statikus import helyett
  a feltöltés-kezelőben **dinamikusan** `await import('@/lib/supabase/client')`-el tölti
  (csak tényleges kép-feltöltéskor). ✅ (tsc + build zöld)
- [x] **D5** 🟢 `next.config.ts`: `experimental.optimizePackageImports: ['@supabase/supabase-js','@supabase/ssr']`. ✅

---

## FÁZIS E – Törzsadat-cache (ritkán változó adatok) 🟡

> Fontos: `export const revalidate` itt **nem** működik, mert a `cookies()` dinamikussá
> teszi az oldalt. Helyette `unstable_cache` (cookie-mentes klienssel) + `revalidateTag`.

> **Megvalósítás:** `lib/cached-data.ts` – `unstable_cache` + service-role (cookie-mentes) kliens,
> 1 órás backstop `revalidate`. Invalidálás: **`updateTag(tag)`** a Server Action-ökben
> (Next 16: azonnali, read-your-own-writes; a `revalidateTag` most 2 argumentumot kér és
> stale-while-revalidate, ezért az `updateTag` a jó CRUD-oldalakra).

- [x] **E1** 🟡 `getSuppliers()` cache (tag: `suppliers`). Bekötve: `beszallitok/page.tsx`,
  `termekek/page.tsx`, `termekek/[id]`, `termekek/uj`, `bevetelezes/page.tsx`, `munka/bevetelezes`.
  `updateTag('suppliers')` a `beszallitok/actions.ts` create/update/delete-ben. ✅
- [x] **E2** 🟡 `getActiveLocations()` cache (tag: `locations`). Bekötve a dropdown-fogyasztókba:
  `betarolas`, `atrarolas`, `munka/betarolas`, `munka/atrarolas`. `updateTag('locations')` a
  `helyek/actions.ts`-ben. A `helyek` és `cimkek` **management** oldalak élők maradnak (szűrők). ✅
- [ ] **E3** 🟡 `products`/`product_units` katalógus cache – **HALASZTVA**: túl dinamikus (ár/új termék
  gyakran változik, a lista keresés-szűrős), a cache haszna kisebb, a staleness-kockázat nagyobb.
- [x] **E4** 🟡 `getCompanySettings()` cache (tag: `company_settings`). Bekötve: `beallitasok/page.tsx`
  és `szallitolevel/page.tsx` (nyomtatásonként újraolvasta). `updateTag('company_settings')` a
  `beallitasok/actions.ts`-ben. ✅ (build + tsc zöld)

---

## FÁZIS F – Perceived speed: loading / error boundaries 🔴

> Jelenleg **sehol** nincs `loading.tsx` / `error.tsx` / `<Suspense>` → minden
> navigációnál üres képernyő a DB-válaszig. Nagy "gyorsabb" érzet kis munkával.

- [x] **F1** 🔴 `app/(admin)/loading.tsx` alap skeleton. ✅
- [x] **F2** 🔴 Saját `loading.tsx`: `statisztika` (KPI + kártyarács), `tranzakciok` (szűrő + táblázat-váz).
  A `termekek`/`helyek`/`beszallitok` a szegmens-szintű `(admin)/loading.tsx`-et örökli (kártyalista skeleton). ✅
- [x] **F3** 🟡 `app/(admin)/error.tsx` és `app/(wizard)/error.tsx` – visszaállítható boundary (reset + újratöltés). ✅
- [~] **F4** 🟡 `statisztika` `<Suspense>`: **tárgytalan** – B2 után egyetlen RPC-hívás van, nincs külön streamelendő nehéz lekérdezés. A `statisztika/loading.tsx` fedi a várakozást.
- [x] **F5** 🟡 `app/(wizard)/loading.tsx` – teljes képernyős töltésjelző a wizard-lépésekhez. ✅
  (build zöld, tsc+eslint zöld)

---

## FÁZIS G – Írási műveletek / round-trip csökkentés 🟡

- [x] **G1** 🟡 `termekek/actions.ts` – a kiszerelés-írás egyetlen `upsert`-re cserélve
  (meglévők frissülnek id alapján, újak beszúródnak). N kör helyett 1. ✅
- [ ] **G2** 🟡 `bevetelezes/actions.ts` – plusz kör a `sorszam`-ért az RPC után.
  **HALASZTVA**: a `create_bevetelezes` return típusát kellene uuid→jsonb-re váltani, ami éles
  függvény DROP+CREATE-et igényel, a haszna viszont 1 kör egy ritka, kézi mentés-műveleten. Nem éri meg most.
- [x] **G3** 🟢 `termekek/actions.ts` – létezés-ellenőrzés exact count helyett
  `.select('id').limit(1).maybeSingle()` (index-backed, olcsóbb). ✅

---

## FÁZIS H – Lapozás / over-fetch 🟡🟢

- [x] **H1** 🟡 Készletlisták felső korlátja **eszköz-szinten, a Beállítások (`/preferenciak`)
  oldalon állítható** (default 500). Tárolás **cookie**-ban (`dw-keszlet-limit`), mert a
  szervernek kérésenként olvasnia kell a lekérdezéshez (localStorage nem menne). Minden munkalista
  (`betarolas`, `kigyujtes`, `kiadas`, `atrarolas`, `selejtezes` + mind az 5 wizard) `.limit(limit)`-tel
  tölt (`getKeszletListaLimit` a cookie-ból), és ha eléri a korlátot, **látható figyelmeztetést** mutat
  (`components/ListLimitNotice.tsx`) - nincs néma levágás. ✅ (tsc + build zöld)
  > Megj.: eredetileg Cégadat/DB-oszlop volt; a felhasználó kérésére áttéve eszköz-szintű
  > cookie-ra a Beállítások oldalra. A rövid életű `keszlet_lista_limit` DB-oszlop eldobva.
- [ ] **H2** 🟢 `select('*')` szűkítése a renderelt oszlopokra: `helyek/page.tsx:22`,
  `cimkek:27`, suppliers-dropdownok (`id, nev` elég): `bevetelezes/page.tsx:18`, `munka/bevetelezes:18`, `termekek/uj:9`.

---

## FÁZIS I – Ellenőrzés / infra (opcionális) 🟢

- [x] **I1** 🟢 ✅ Megerősítve: a projekt **ES256 (aszimmetrikus)** kulcsot használ (`in_use`),
  a régi HS256 csak `previously_used`. A JWKS ES256-ot publikál. → `getClaims()` lokálisan ellenőriz,
  nincs hálózati kör requestenként. (Ellenőrizve: JWKS well-known + Management API signing-keys, 2026-07-25.)
- [ ] **I2** 🟢 Fluid Compute bekapcsolása (Vercel → Functions) – kisebb cold start (~1.3s → kevesebb). Ingyenes.
- [ ] **I3** 🟢 Régió-újraellenőrzés deploy után az `x-vercel-id` fejléccel (`fra1::fra1` a jó minta egy hitelesített adatoldalon).

---

## Javasolt sorrend

1. **A fázis** (indexek) – 1 migráció, azonnal hat, semmit nem tör el.
2. **C1 + D1** – egysoros nagy nyeremények (count → planned; 1 MB WASM kivétele).
3. **B fázis** – statisztika párhuzamosítás + dátum-bound.
4. **F1–F2** – loading skeletonok (érezhető gyorsulás).
5. **D2** – képoptimalizálás (terméklista először).
6. **E fázis** – törzsadat-cache (nagyobb átalakítás, de tartós nyereség).
7. **G / H / I** – ráérős finomítások.
