# Terv: Bevételezés szállítólevél-alapú átalakítása

> Kiindulás (felhasználói igény, 2026-07-26): a logisztikai gyakorlatban **minden
> bevételezés a szállítólevél számához fűződik**, nem a beszállítóhoz vagy a
> dátumhoz. A dátum és a beszállító is kell, de az elsődleges azonosító mindig a
> szállítólevél szám. Emellett a bevételezéseket **sehol nem lehet megtekinteni
> vagy szerkeszteni**.

---

## 0. Mit találtunk a jelenlegi kódban (a terv indoklása)

1. **A bejövő szállítólevél száma nincs eltárolva.** A `delivery_notes.sorszam`
   mindkét irányban generált: `KIAD-2026-00001` (`kiadas_rpcs.sql:95`) és
   `BEV-2026-00001` (`stock_rpcs.sql:57`). A kiadásnál ez helyes – azt a
   dokumentumot **mi** állítjuk ki. A bevételezésnél viszont egy olyan
   dokumentumra hivatkozik, amit nem mi adtunk ki: a beszállító papírján lévő
   szám sehol nem szerepel.

2. **Az „egy tétel" mód minden tételnek külön szállítólevelet nyit.** A
   `submitSingle()` (`BevetelezesWizard.tsx:149`) egy elemű `items` tömbbel hívja
   a `create_bevetelezes`-t, ami mindig új `delivery_notes` sort szúr be; a
   `reset()` (`:57-75`) nullázza a beszállítót és visszaugrik az 1. lapra.
   → egy 20 tételes beszállítás = 20 „szállítólevél", 20× újra kiválasztott
   beszállító. Egyszerre pontatlan és lassú.

3. **A menüs `/bevetelezes` is csak felvivő form** (`page.tsx:46` →
   `BevetelezesForm`). Nincs lista, nincs részletező, nincs szerkesztés. A
   `delivery_notes`-ot az egész appban két hely olvassa:
   `bevetelezes/actions.ts:45` (sorszám visszaadás) és
   `kiadas/[id]/szallitolevel/page.tsx:54`.

4. **A `stock_items`-nek nincs `delivery_note_id`-ja.** A szállítólevél ↔ tétel
   kapcsolat csak a `movement_log`-on él (`tipus='bevetelezes'` +
   `delivery_note_id` + `stock_item_id`). Ez a listázáshoz/részletezéshez elég,
   nem kell érte séma-változás.

5. Éles adat a terv írásakor: 11 bejövő szállítólevél (1 beszállító nélkül, 0
   tétellel), a `BEV-2026-001xx` sorozat a `seed-demo.mjs`-ből. Egyiken sincs
   papírszám (az oszlop most jön létre).

## 0.1 Felhasználói döntések (2026-07-26)

- **Szállítólevél szám és beszállító is kötelező** bevételezésnél. A jelenlegi
  „- Beszállító nélkül -" opció megszűnik.
- **Minden szerkeszthető, de korrekciós mozgás keletkezik**: a javítások nem
  csendes UPDATE-ek, hanem nyomot hagynak a `movement_log`-ban.
- **Az „egy tétel" mód megszűnik** – a listás („több tétel") ág egy tételre is
  alkalmas. ⚠️ Ezért a listás ágba **be kell tenni a LOT / lejárat / sérülés
  kezelést**, ami eddig csak az egy tételes ágon volt (különben funkció vész el).

---

## 1. FÁZIS – Séma

### 1.1 `delivery_notes` bővítés (M1)
- [x] `szallitolevel_szam text` új oszlop – a **beszállító papírszáma**.
- [x] Részleges unique index: `(supplier_id, szallitolevel_szam)` ahol
  `irany='bevetelezes'`. Ez teszi lehetővé a „hozzáfűzés ugyanahhoz a
  szállítólevélhez" logikát, és megakadályozza, hogy ugyanaz a papír kétszer
  nyíljon meg külön levélként.
- [x] CHECK **NOT VALID**: `irany <> 'bevetelezes' or (supplier_id is not null
  and szallitolevel_szam is not null)`. A `NOT VALID` azért kell, mert a 11
  meglévő demo sor nem felel meg – azokat nem hamisítjuk meg visszamenőleg,
  de új/módosított sor már nem sértheti. A kötelezőséget az RPC is ellenőrzi.
- [x] Keresés/lista indexek: `(szallitolevel_szam)` és `(irany, datum desc)`.
- [x] A `sorszam` MARAD, de **lefokozva belső azonosítóra** – a UI-ban a
  szállítólevél szám az elsődleges, a `BEV-…` másodlagos/technikai.

### 1.2 `movement_tipus` bővítés (M2, önálló migráció)
- [x] `alter type movement_tipus add value 'korrekcio'`.
  Külön fájlban, mert az `ALTER TYPE ADD VALUE` új értéke ugyanabban a
  tranzakcióban nem használható.
- [x] `lib/stock.ts`: `MOVEMENT_TIPUS_LABEL` / `_COLOR` / `_OPTIONS` bővítés
  (ezek `Record<MovementTipus, …>`, tehát a tsc ki is kényszeríti).

---

## 2. FÁZIS – RPC-k (M3)

### 2.1 `create_bevetelezes` v2 – find-or-create
- [x] Új szignatúra: `(p_supplier_id, p_szallitolevel_szam, p_datum,
  p_fenykep_url, p_items)`. Paraméter bővítés miatt DROP + CREATE kell.
- [x] **Find-or-create**: ha a `(supplier_id, szallitolevel_szam,
  irany='bevetelezes')` hármas már létezik → a tételek **hozzáfűződnek**, nem
  nyílik új levél. Különben új levél a generált `sorszam`-mal.
- [x] Hozzáfűzéskor a levél `datum`-át **nem** írjuk át (a papír dátuma a levélé;
  a tételek a saját `movement_log.created_at`-jüket viszik). A dátum a webes
  nézetben szerkeszthető.
- [x] Kötelezőség ellenőrzése: supplier és szállítólevél szám nélkül hibát dob.
- [x] Visszatérés `uuid` helyett **`jsonb`**: `{note_id, sorszam,
  szallitolevel_szam, uj_level, tetelek}`. Ezzel a **G2 feladat is megszűnik**
  (eddig plusz kör kellett a `sorszam`-ért a `actions.ts:44-48`-ban).

### 2.2 Szerkesztő RPC-k
- [x] `update_bevetelezes_note(...)` – fejléc: szállítólevél szám, beszállító,
  dátum, EKAER, fotó. A unique indexet tiszteli (érthető hibaüzenettel).
- [x] `korrigal_bevetelezes_tetel(p_stock_item_id, p_uj_mennyiseg_alap, p_lot,
  p_lejarat, p_megjegyzes)`:
  - `movement_log` sor `tipus='korrekcio'`, `mennyiseg` = **előjeles delta**
    (új − régi), `delivery_note_id`, `stock_item_id`, `megjegyzes`
  - utána `stock_items.mennyiseg_alapegysegben` frissítés
  - **elutasítja**, ha az új mennyiség negatív lenne
  - ha a tétel már mozgott (`betarolva`/`kigyujtve`/`kiadva`), a javítás
    engedett (felhasználói döntés), de a mozgás rögzíti, és a UI kiírja a tétel
    aktuális státuszát figyelmeztetésként
- [x] `sztorno_bevetelezes_tetel(p_stock_item_id, p_megjegyzes)` – teljes
  visszavonás: `korrekcio` mozgás a teljes negatív deltával + `mennyiseg = 0`.
  A `stock_items` sor **megmarad** (nyomkövetés), a UI „sztornózva"-ként jelöli.

---

## 3. FÁZIS – Wizard (mobil, gyors bevételezés)

> Alapelv változatlan: a wizard lényege a **sebesség**. Nem kerül bele több
> lépés, mint amennyi feltétlenül kell – a módválasztás kiesésével összességében
> **kevesebb** koppintás lesz, mint most.

- [x] Módválasztó („Egy tétel" / „Több tétel") **törlése**. A két gomb helyére:
  - **„Bevételezés"** (elsődleges) – a korábbi „Több tétel" ág, ez lép a
    tételfelvitelre. Csak akkor aktív, ha a szállítólevél szám és a beszállító
    ki van töltve.
  - **„Korábbi bevételezések"** (másodlagos) – átdob a menüs `/bevetelezes`
    listára. Név indoklása: az a nézet lista lesz (a felvitel `/bevetelezes/uj`-ra
    kerül), ezért a „Részletes bevételezés" félrevezető lenne – azt sugallná,
    hogy ott is új bevételezés indul.
- [x] **1. lépés – Szállítólevél**: szállítólevél szám (nagy, elsődleges mező,
  kötelező) + beszállító (kötelező) + dátum + opcionálisan a szállítólevél
  fotója. A fotó itt a **levélhez** tartozik, nem a tételhez – ez a helye
  (`delivery_notes.fenykep_url`), eddig tételenként töltődött fel.
- [x] **2. lépés – Tételek**: szkennelés/keresés, alatta a felvitt sorok.
  Soronként mennyiség-léptető + **összecsukható „Részletek"**: LOT, lejárat,
  „sérülten érkezett" + selejt ok. Alapból csukva, hogy ne lassítsa a gyors utat.
- [x] A fejlécben végig látszik, melyik szállítólevél van nyitva.
- [x] **3. lépés – Kész**: összegzés, „Tovább a betárolásra", „Új szállítólevél".
- [x] Mentés után NEM az 1. lapra ugrunk vissza: ugyanaz a levél marad nyitva.

---

## 4. FÁZIS – Webes nézet (`/bevetelezes`)

- [x] **`/bevetelezes` → lista** (ez lesz a főnézet a mostani form helyett):
  szállítólevél szám (elsődleges), beszállító, dátum, tételszám, össz. db,
  fotó-jelző, belső `BEV-…` másodlagosan.
  Szűrés: szállítólevél szám, beszállító, dátum tól–ig. Lapozás.
- [x] **`/bevetelezes/uj` → felvitel**: a mostani `BevetelezesForm` ide kerül
  (a lista maradjon tiszta főnézet), a szállítólevél szám + kötelező beszállító
  mezőkkel.
- [x] **`/bevetelezes/[id]` → részletező + szerkesztés**:
  - fejléc szerkesztése (`update_bevetelezes_note`)
  - tételek listája: termék, kiszerelés, mennyiség, LOT, lejárat, **státusz**
  - tételenként javítás (`korrigal_bevetelezes_tetel`) és sztornó
    (`sztorno_bevetelezes_tetel`), a státusz figyelmeztetéssel
  - a korrekciós előzmény megjelenítése (a tétel `movement_log` sorai)
- [~] `loading.tsx` a szegmensbe – **nem kellett külön fájl**: a szegmens-szintű
  `app/(admin)/loading.tsx` (kártyalista skeleton) mindhárom új útvonalat fedi
  (`/bevetelezes`, `/bevetelezes/uj`, `/bevetelezes/[id]`), és a lista/részletező
  is kártyás elrendezésű – saját skeleton nem adna hozzá.

---

## 5. Amit szándékosan NEM tartalmaz

- Az **kiadás/kiszállítás oldal változatlan**: ott a saját `KIAD-…` sorszám
  helyes, azt a dokumentumot mi állítjuk ki.
- Nem kerül bele EKAER-kitöltési logika és NAV J09 export – azok külön tételek
  a `FELADATLISTA.md`-ben, és a felhasználó szerint jelenleg nem aktuálisak
  (az EKAER mező viszont a fejléc-szerkesztőben elérhető lesz, mert a séma már
  most is tartalmazza).
- A `sorszam` nem szűnik meg és nem alakul át (`unique not null`, migrációs
  kockázat nélkül marad belső azonosítónak).

---

## Javasolt sorrend

1. M1 + M2 séma migrációk (alkalmazás + ellenőrzés)
2. `lib/stock.ts` enum-kiegészítés (tsc vezet)
3. M3 RPC-k + `actions.ts` átírás (a G2 kör is itt szűnik meg)
4. Wizard egyesítés
5. Webes lista → részletező → szerkesztés
6. tsc + eslint + build minden fázis után
