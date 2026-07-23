# Ital Nagykereskedés – Logisztikai Admin Rendszer
## Fejlesztési feladatlista (Claude Code számára)

> Cél: első fázisban egy védett admin felület, ami a raktári logisztikát kezeli
> (helyek, termékek, készletmozgások, dashboard). A webshop később épül rá,
> ugyanarra az adatbázisra és repóra.

---

## 0. Tech stack és alapelvek

- **Frontend/Backend**: Next.js (App Router), TypeScript
- **Adatbázis / Auth / Storage**: Supabase (Postgres, Auth, RLS, Storage a fotókhoz/PDF-ekhez)
- **Deploy**: később Vercel, aldomain routing (pl. `admin.pelda.hu`)
- **Egy repo**, route group-okkal elválasztva: `app/(admin)/...` és később `app/(shop)/...`
- **Nincs nyilvános regisztráció** – felhasználót csak a fő admin hoz létre (Supabase service role key, szerver oldali API route)
- Minden készletmozgás egységes `movement_log` táblába kerül, típus szerint szűrve
- Minden termék **több kiszerelési szinttel** rendelkezhet (palack/karton/raklap), mindegyiknek saját vonalkódja, mennyisége, ára
- **LOT/lejárat szintű** készletnyilvántartás (FEFO elv)
- Tárhelyek **QR kóddal**, termékek **EAN vonalkóddal** azonosítva
- Jövedéki és ÁFA megfelelőségi mezőket a séma elejétől kezelve be kell tervezni (ld. 9. szakasz)

---

## 1. FÁZIS – Alapinfrastruktúra

### 1.1 Projekt inicializálás
- [x] Next.js (App Router, TypeScript) projekt létrehozása
- [x] Supabase projekt létrehozása, Supabase CLI telepítése és inicializálása (`supabase init`)
- [x] `.env.example` és `.env.local` (utóbbi git-ignore-olva) – `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] `supabase/migrations` mappa – minden séma-változás migrációként kerüljön be, ne csak Supabase UI-ban

### 1.2 Auth és middleware
- [x] Supabase Auth bekötése (email + jelszó, nincs nyilvános regisztráció)
- [x] `profiles` tábla `role` mezővel (lásd 2.7 tábla), kapcsolva `auth.users`-hez
- [x] `middleware.ts`: aldomain/route-alapú védelem – ha a user nincs bejelentkezve vagy nem megfelelő role-lal rendelkezik, redirect `/login`-ra _(Next 16: `proxy.ts`)_
- [x] Admin API route user meghívásához/létrehozásához (service role key, szerver oldalon, SOHA klienshez ne kerüljön) _(server action service role-lal, admin-ellenőrzéssel – Modul 9)_

### 1.3 UI váz
- [x] Admin layout (oldalsáv navigáció a modulokhoz, header, user menü)
- [x] Közös `<Scanner />` komponens (QR + EAN/Code128 olvasás kamerával, pl. `html5-qrcode` vagy `@zxing/library`) _(`@zxing/browser`; bekötve: bevételezés vonalkód, termék EAN, betárolás/átrárolás tárhely QR)_
- [ ] Közös form/tábla komponensek (lista, szűrés, pagináció) – ezt minden modul újrahasználja

---

## 2. Adatbázis séma (Supabase / Postgres)

> Az alábbi táblák migrációként kerüljenek létrehozásra, RLS-sel védve.
> Minden táblához `created_at`, `updated_at`, és ahol releváns, `created_by` mező is kerüljön.

### 2.1 `locations` (raktári helyek)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| sor | text | |
| polc | text | |
| polcsor | text | |
| tarhely | text | |
| teljes_kod | text UNIQUE | pl. `A-01-02-03`, generált |
| qr_kod | text UNIQUE | QR-hez kódolt azonosító |
| tipus | enum | `pick`/`raktár`/`puffer`/`karantén` |
| aktiv | boolean | |

### 2.2 `products` (alaptermék)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| nev | text | |
| kategoria | text | |
| gyarto_beszallito_id | uuid FK → `suppliers` | |
| leiras | text | |
| alkoholtartalom | numeric | % |
| jövedéki | boolean | |
| jövedéki_termékkategória | enum | sör/bor/köztes/alkoholtermék |
| kn_kod | text | vámtarifaszám, jövedéki riporthoz |
| fajtakod | text | NAV fajtakód |
| min_keszlet | integer | riasztáshoz |
| aktiv | boolean | |

### 2.3 `product_units` (kiszerelési szintek)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK | |
| kiszereles | enum | `palack`/`karton`/`raklap` |
| vonalkod | text UNIQUE | EAN |
| mennyiseg_alapegysegben | integer | pl. karton = 12 palack |
| netto_ar | numeric | |
| brutto_ar | numeric | |
| afa_kulcs | numeric | alapból 27 |
| beszerzesi_ar | numeric | |
| betetdij_tipus | enum | `nincs`/`kötelező_eldobható`/`kötelező_újrahasználható`/`önkéntes` |
| betetdij_osszeg | numeric | |

### 2.4 `suppliers` (beszállítók)
| mező | típus |
|---|---|
| id | uuid PK |
| nev | text |
| adoszam | text |
| cim | text |
| kapcsolattarto | text |

### 2.5 `stock_items` (LOT/tétel szintű készlet)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| product_id | uuid FK | |
| product_unit_id | uuid FK | melyik kiszerelésben van nyilvántartva |
| lot_szam | text | |
| lejarat_datum | date | |
| location_id | uuid FK nullable | NULL = pufferben, nincs betárolva |
| mennyiseg_alapegysegben | integer | mindig alapegységben (palack) |
| statusz | enum | `puffer`/`betárolva`/`kigyűjtve`/`kiadva`/`selejtezve` |

### 2.6 `movement_log` (minden készletmozgás egységesen)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| tipus | enum | `bevételezés`/`betárolás`/`kigyűjtés`/`kiadás`/`átrárolás`/`selejtezés` |
| stock_item_id | uuid FK | |
| mennyiseg | integer | alapegységben |
| forras_location_id | uuid FK nullable | |
| cel_location_id | uuid FK nullable | |
| selejt_ok | enum nullable | sérült/lejárt/hiány/egyéb – csak selejtezésnél |
| selejt_forras_lepes | enum nullable | bevételezés/betárolás/kigyűjtés/kiadás – honnan történt a selejtezés |
| delivery_note_id | uuid FK nullable | |
| user_id | uuid FK | ki végezte |
| megjegyzes | text | |
| created_at | timestamptz | |

### 2.7 `profiles` (felhasználók, jogosultság)
| mező | típus |
|---|---|
| id | uuid PK, = auth.users.id |
| nev | text |
| role | enum: `admin`/`staff` |
| aktiv | boolean |

### 2.8 `delivery_notes` (szállítólevelek)
| mező | típus | megjegyzés |
|---|---|---|
| id | uuid PK | |
| irany | enum | `bevételezés`/`kiadás` |
| supplier_id | uuid FK nullable | bevételezésnél |
| vevo_nev | text nullable | kiadásnál |
| datum | date | |
| fenykep_url | text nullable | bevételezésnél, Supabase Storage |
| pdf_url | text nullable | kiadásnál generált PDF |
| sorszam | text UNIQUE | szekvenciális azonosító |

### 2.9 RLS szabályok
- [x] Minden fenti táblán RLS engedélyezve
- [x] Policy: csak bejelentkezett, `staff` vagy `admin` role-lal rendelkező user érhet el bármit
- [x] `profiles` tábla módosítása (role kiosztás) csak `admin` role-nak engedélyezett
- [ ] Webshop (későbbi) publikus policy-k külön, csak a `products`/`product_units` publikus mezőire

---

## 3. MODUL – Raktári helyek + címkenyomtatás

- [x] CRUD felület: sor/polc/polcsor/tárhely létrehozása, szerkesztése _(törlés helyett deaktiválás)_
- [x] Automatikus `teljes_kod` generálás a négy komponensből _(DB generated column + élő előnézet)_
- [x] QR kód generálás minden tárhelyhez (pl. `qrcode` npm csomag)
- [x] Címke nyomtatási nézet (nyomtatóbarát HTML/PDF, több címke egy lapon, A4 vagy címkenyomtató méretre)
- [x] Lista/szűrés nézet (sor szerint, típus szerint, aktív/inaktív)

---

## 4. MODUL – Termékek

- [x] Termék CRUD (`products` tábla mezői alapján)
- [x] Kiszerelési szintek kezelése termékenként (`product_units`) – dinamikusan hozzáadható/törölhető sorok (palack/karton/raklap)
- [x] Minden kiszereléshez: vonalkód (kézi beviteli mező VAGY kamerás beolvasás a `<Scanner />`-rel), mennyiség alapegységben, árak, betétdíj _(kézi bevitel kész + űrtartalom; Scanner bekötés az 1.3 komponens elkészültekor)_
- [x] Beszállító kiválasztása/kezelése (`suppliers` CRUD)
- [x] Validáció: vonalkód egyedi legyen az összes `product_units` sor között
- [x] Termék lista: keresés név/vonalkód szerint, szűrés kategória/beszállító szerint

---

## 5. MODUL – Bevételezés → Betárolás

### 5.1 Bevételezés
- [x] Új bevételezés indítása: beszállító kiválasztása, dátum
- [x] Tételek felvitele: vonalkód beolvasás (Scanner) → automatikus termék/kiszerelés felismerés → mennyiség megadása (a kiszerelés egységében, pl. "3 karton") → automatikus átváltás alapegységre _(kézi vonalkód/dropdown + átváltás-megerősítés; Scanner bekötés később)_
- [x] LOT szám és lejárati dátum megadása tételenként
- [x] Szállítólevél **fotó** feltöltése (Supabase Storage) → `delivery_notes` rekord létrehozása
- [x] Mentéskor: `stock_items` létrehozása `statusz = 'puffer'`, `location_id = NULL`, + `movement_log` bejegyzés `tipus = 'bevételezés'` _(atomi RPC)_
- [x] **Selejt opció** bevételezés közben: ha egy tétel sérülten érkezik, "Selejt" gombbal `movement_log` bejegyzés `tipus = 'selejtezés'`, `selejt_forras_lepes = 'bevételezés'`, a tétel nem kerül be jó készletként

### 5.2 Betárolás
- [x] Pufferben lévő (`statusz = 'puffer'`) tételek listája
- [x] Tétel kiválasztása → cél tárhely QR beolvasása (Scanner) → mennyiség megadása (részleges betárolás támogatása: egy tétel több helyre is szétosztható) _(tárhely dropdown; QR-scan később)_
- [x] Mentéskor: `stock_items.location_id` és `statusz = 'betárolva'` frissítés (vagy megosztás esetén új `stock_items` sor), + `movement_log` bejegyzés `tipus = 'betárolás'` _(atomi RPC)_
- [x] **Selejt opció** betárolás közben, `selejt_forras_lepes = 'betárolás'`

---

## 6. MODUL – Kigyűjtés → Kiadás

### 6.1 Kigyűjtés
- [x] Kiadandó tételek listája (rendelés/igény alapján, vagy szabad kigyűjtés – döntés szükséges, ld. nyitott kérdések) _(szabad kigyűjtés kész; rendeléshez kötött ág = külön Rendelések modul később)_
- [x] FEFO logika: a rendszer a legkorábbi lejáratú, betárolt tételt/helyet ajánlja fel elsőként
- [x] Tárhely QR + termék vonalkód beolvasás megerősítéshez _(hely/tétel látszik; QR/vonalkód-scan a Scanner elkészültekor)_
- [x] Mentéskor: `stock_items.statusz = 'kigyűjtve'`, helyhez kötött készlet csökken, + `movement_log` bejegyzés `tipus = 'kigyűjtés'` _(atomi RPC)_
- [x] **Selejt opció**, `selejt_forras_lepes = 'kigyűjtés'`

### 6.2 Kiadás
- [x] Kigyűjtött tételek összesítése egy kiadási bizonylatba
- [x] Vevő adatok megadása
- [x] Szállítólevél **PDF generálás és nyomtatás** (sorszámozott, a Jöt. Vhr. 36. § szerinti kötelező tartalommal: kiszállító adatai + jövedéki engedélyszám, KN-kód, mennyiség, alkoholtartalom, vevő adatai) _(nyomtatható HTML/PDF nézet + Cégadatok szerkesztő; szerveroldali PDF-fájl generálás/tárolás opcionális későbbre)_
- [x] Mentéskor: `stock_items.statusz = 'kiadva'`, globális készlet csökken, + `movement_log` bejegyzés `tipus = 'kiadás'`, `delivery_notes` rekord PDF-fel _(atomi RPC; pdf_url a nyomtatható nézet)_
- [ ] **Selejt opció**, `selejt_forras_lepes = 'kiadás'` _(kigyűjtésnél van selejt; a kiadás-lépésbeli selejt + az önálló Selejtezés modul (8) még hátra)_

---

## 7. MODUL – Átrárolás

- [x] Forrás tárhely QR beolvasás → termék/tétel kiválasztás → cél tárhely QR beolvasás → mennyiség _(hely/tétel dropdown; QR-scan a Scanner elkészültekor)_
- [x] Mentéskor: `stock_items.location_id` frissítés (vagy megosztás), + `movement_log` bejegyzés `tipus = 'átrárolás'`, forrás és cél hely rögzítve _(atomi RPC)_
- [x] Globális készletet nem érinti

---

## 8. MODUL – Selejtezés (önálló felület is)

- [x] Önálló selejtezési felület (nem csak a fenti modulokba ágyazott gomb) – vonalkód/QR alapján bármely készleten lévő tétel selejtezhető _(név-keresés; QR/vonalkód-scan a Scanner elkészültekor)_
- [x] Kötelező indok mező: `sérült`/`lejárt`/`hiány`/`egyéb`
- [x] Opcionális fotó/dokumentáció csatolása _(selejt-notes Storage bucket)_
- [x] Mentéskor: globális + helyhez kötött készlet csökken, `movement_log` bejegyzés `tipus = 'selejtezés'` _(atomi RPC)_
- [x] Selejt riport: időszak/ok/termék szerinti bontás (a dashboard része) _(dashboard: selejt ok szerinti bontás)_

---

## 9. MODUL – Felhasználók kezelése

- [x] Lista: aktív/inaktív userek, role
- [x] Új user meghívása (email megadása, szerver oldali API route service role key-jel → Supabase Auth invite) _(service role-lal createUser + ideiglenes jelszó; email-invite SMTP-t igényelne)_
- [x] Role kiosztás/módosítás (`staff`/`admin`)
- [x] Deaktiválás (nem törlés)
- [x] Csak `admin` role éri el ezt a modult _(requireAdmin + is_admin RLS)_

---

## 10. MODUL – Dashboard

- [x] Bevétel/eladás időszak szerint (nap/hét/hónap), grafikon _(utolsó 30 nap, napi bevételezés vs. kiadás)_
- [x] Top termékek eladás szerint
- [x] Készletérték (globális + helyenkénti bontás) _(beszerzési áron)_
- [x] Alacsony készlet riasztás (`min_keszlet` alapján)
- [x] Selejt/veszteség kimutatás – **külön sor**, nem eladásként számolva, ok szerinti bontásban
- [x] Puffer/kigyűjtve állapotú tételek áttekintése (mennyi van "félkész" állapotban)

---

## 11. Megfelelőségi / jövedéki kiegészítések (később, de séma szinten előkészítve)

- [ ] Havi NAV_J09 adatszolgáltatáshoz szükséges export (beszerzés, készletcsökkenés, napi zárókészlet telephelyenként) – riport generálás `movement_log`-ból
- [ ] Szállítólevél PDF sablon a Jöt. Vhr. 36. § kötelező tartalmi elemeivel (ld. korábbi kutatási riport)
- [ ] EKAER szám mező előkészítése a `delivery_notes`/`movement_log` táblán (kitöltése egyelőre manuális/opcionális)
- [ ] Cégadatok (jövedéki engedélyszám, FELIR azonosító) egy `company_settings` táblában, számlákon/szállítóleveleken felhasználva

---

## Nyitott kérdések (implementáció előtt tisztázandó)

1. **Kigyűjtés**: mindig konkrét rendeléshez/kiadási tételhez kötött legyen, vagy lehet "szabad" kigyűjtés is, amit utólag rendelnek egy kiadáshoz?
2. **Részleges mozgás**: egy bevételezési/betárolási tétel szétosztható-e több tárhelyre/több LOT-ra egyszerre, vagy mindig egyben mozog?
3. Karton/raklap vonalkód beolvasásakor legyen-e megerősítő kérdés ("biztosan X karton, azaz Y palack?") a hibás mennyiség elkerülésére?

---

## Javasolt build sorrend

1. Fázis 1 (infrastruktúra: Next.js + Supabase + Auth + middleware)
2. Fázis 2 (teljes DB séma migrációként, RLS)
3. Modul 3 (raktári helyek + QR címke) – ez a legfüggetlenebb, jó kiindulás
4. Modul 4 (termékek + kiszerelések)
5. Modul 5–6 (bevételezés/betárolás, kigyűjtés/kiadás) – ezek épülnek a 3–4 modulra
6. Modul 7–8 (átrárolás, selejtezés)
7. Modul 9 (felhasználók)
8. Modul 10 (dashboard) – utolsó, mert az összes korábbi adatra épül
