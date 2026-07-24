# Terv: Főoldal átalakítás, mobil wizard-flow-k, mobil technikai javítások

> Ez a dokumentum a meglévő projekt (Node.js/Next.js + Supabase raktárkezelő) kiegészítése.
> Nem érinti a meglévő menüből elérhető, görgethető oldalakat — azok változatlanul megmaradnak,
> ez egy **második, párhuzamos belépési pont** a napi munkafolyamatokhoz.

---

## 1. MODUL – Főoldal átalakítás (munkaválasztó)

### 1.1 Elrendezés
- [x] Jelenlegi főoldal (Dashboard) → átnevezés **"Statisztika"**-ra, marad a menüben a jelenlegi helyén, funkcionálisan változatlan → `/statisztika`
- [x] Menü egyéb elemei (Felhasználók kezelése, Termékek, Raktári helyek stb.) — **nem változnak**
- [x] Új főoldal: kártyás munkaválasztó, mobilon 2 oszlopos rács (grid) → `app/(admin)/page.tsx`
- [x] Kártyák (6 db, 3×2 elrendezés):
  1. Bevételezés
  2. Betárolás
  3. Átrárolás
  4. Összekészítés
  5. Kiszállítás
  6. Selejtezés
- [x] Minden kártya: ikon + felirat, nagy érintési felület (mobilbarát méret, min. ~120×120px)
- [x] Kártyára koppintás → átnavigál az adott modul wizard-flow-jának 1. lépésére (`/munka/...`)

### 1.2 Navigáció
- [x] Főoldal legyen elérhető külön útvonalon (pl. `/` vagy `/munka`), a jelenlegi Dashboard/Statisztika saját útvonalra kerül (pl. `/statisztika`)
- [x] Fejlécben/alsó navigációban maradjon egy visszaút a "klasszikus" menühöz (a jelenlegi oldalsáv/menürendszer) — az oldalsáv/MobileNav a főoldalon is megmarad

---

## 2. MODUL – Mobil wizard-flow-k (6 modul)

### Általános viselkedési szabályok minden wizard-flow-nál
> Közös infrastruktúra: `components/wizard/WizardShell.tsx` (keret + akciók),
> `ScrapDialog.tsx` (Selejt gomb modal), `parts.tsx` (lépéscím, mennyiség-léptető,
> összegzés). Route group: `app/(wizard)/` (teljes képernyős, auth-védett).
- [x] Egy képernyő = egy lépés, nincs görgetés, nagy gombok/mezők
- [x] Minden lépésen három akció: **Vissza** | **Selejt** | **Tovább**
- [x] Külön **Mégse** gomb minden lépésen — megszakítja a folyamatot, visszavisz a főoldali kártyaválasztóra, a bevitt adat **nem kerül mentésre** (nincs piszkozat-mentés)
- [x] Utolsó lépés (kész/összegzés): rövid összefoglaló a rögzített adatokról + **"Új [X] indítása"** gomb, ami visszaviszi a modul 1. lépésére
- [x] Nincs progress-jelző (pl. "2/4")
- [x] Adatmentés ugyanazokba a táblákba történik, mint a meglévő görgethető oldalaknál (a meglévő server actionöket hívjuk újra)
- [x] Minden wizard-flow saját state-gépként épül (React state a WizardShell keretben)

### 2.1 Bevételezés (wizard) — KÉSZ (`app/(wizard)/munka/bevetelezes/`)
> Egy tétel / folyamat (mobilos). A meglévő `createBevetelezes`-t hívja egyelemű
> items-tömbbel. A „Selejt” itt a „sérülten érkezett” jelölő a 3. lépésben (még
> nincs stock_item, amire külön selejt menne).
1. [x] Beszállító kiválasztása (+ dátum)
2. [x] Termék szkennelése (vonalkód) / kiválasztása
3. [x] Mennyiség megadása + LOT szám + lejárati dátum (+ átváltás db-re)
4. [x] Szállítólevél fotó feltöltése (opcionális)
5. [x] Kész / összegzés (sorszám)

### 2.2 Betárolás (wizard) — KÉSZ (`app/(wizard)/munka/betarolas/`)
1. [x] Puffer tétel kiválasztása (vagy termék szkennelése)
2. [x] Mennyiség megerősítése
3. [x] Tárhely szkennelése (QR)
4. [x] Kész / összegzés

### 2.3 Átrárolás (wizard) — KÉSZ (`app/(wizard)/munka/atrarolas/`)
1. [x] Forrás tárhely szkennelése (vagy lista)
2. [x] Termék szkennelése (a forrás helyen lévők közül)
3. [x] Mennyiség megadása
4. [x] Cél tárhely szkennelése (vagy lista, ≠ forrás)
5. [x] Kész / összegzés

### 2.4 Összekészítés / kigyűjtés (wizard) — KÉSZ (`app/(wizard)/munka/osszekeszites/`)
> Az adatmodellben nincs „rendelés” entitás → a lépések a valós kigyűjtésre
> igazítva: FEFO-ajánlott tétel → tárhely megerősítés → mennyiség.
1. [x] Tétel kiválasztása (FEFO-ajánlással, szkenneléssel)
2. [x] Termék szkennelése (a tételválasztásba integrálva)
3. [x] Tárhely szkennelése (megerősítő lépés)
4. [x] Mennyiség megadása
5. [x] Kész / összegzés

### 2.5 Kiszállítás / kiadás (wizard) — KÉSZ (`app/(wizard)/munka/kiszallitas/`)
1. [x] Gyűjtött tételek áttekintése (több-tétel kiválasztás)
2. [x] Megerősítés (vevő neve + dátum)
3. [x] Szállítólevél generálás (`kiad` RPC + link a szállítólevélre)
4. [x] Kész / összegzés

### 2.6 Selejtezés (wizard, önálló belépési pont) — KÉSZ (`app/(wizard)/munka/selejtezes/`)
1. [x] Termék szkennelése / kiválasztása
2. [x] Tárhely szkennelése (kihagyható lépés — „Kihagyom” gombbal)
3. [x] Mennyiség megadása
4. [x] Indok kiválasztása (sérült / lejárt / hiány / egyéb)
5. [x] Kész / összegzés

### 2.7 "Selejt" gomb viselkedése a többi modulban
- [x] Elérhető a Betárolás / Összekészítés / Átrárolás wizardöknél, amint van kiválasztott tétel (`ScrapDialog` modal). Bevételezésnél „sérülten érkezett” jelölő, Kiszállításnál (több-tétel) nincs egy-terméknyi kontextus → kihagyva.
- [x] Ugyanazt a termék/mennyiség kontextust használja (a modal a kiválasztott tétellel és max. mennyiséggel nyílik)
- [x] `movement_log`-ba `tipus = 'selejtezés'` + `selejt_forras_lepes`: Betárolás → `betarolas`, Összekészítés → `kigyujtes`. (Átrárolásnál nincs `atrarolas` enum-érték → önálló selejt, `forras_lepes = null`.)

---

## 3. MODUL – Mobil technikai javítások

- [x] **Viewport javítás**: `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no` → `app/layout.tsx` `viewport` export
- [x] **PWA-sítás**: `manifest.ts` (Next.js MetadataRoute.Manifest)
  - [x] `"display": "standalone"` — böngészősáv nélküli megjelenéshez
  - [x] `"orientation": "portrait"` — álló nézet rögzítéséhez
  - [x] Ikonok (192/512 + maskable) a "Hozzáadás a kezdőképernyőhöz" funkcióhoz
- [ ] Service worker alapszintű beállítása (ha még nincs), mert ez feltétele a teljes PWA-viselkedésnek
- [ ] Tesztelés: telepítés utáni fullscreen + orientáció-zár ellenőrzése Android/iOS eszközön (eszközön, kézzel)

---

## Nyitott kérdés a fejlesztés előtt

- [x] Selejtezés wizard 2. lépése (tárhely szkennelés) — **döntés: benne van, „Kihagyom” gombbal** (puffer tételnél eleve nincs tárhely, ott a lépés csak tájékoztat).

---

## Javasolt build-sorrend

1. [x] Statisztika átnevezés (gyors, kockázatmentes)
2. [x] Mobil technikai javítások (viewport, PWA manifest) — SW + eszközteszt még hátra
3. [x] Főoldal munkaválasztó UI (kártyák, navigáció)
4. [x] Wizard-flow-k modulonként: **Betárolás [x] · Bevételezés [x] · Átrárolás [x] · Összekészítés [x] · Kiszállítás [x] · Selejtezés [x]**

---

## Állapot (2026-07-24)

**Kész és buildel** (`next build` zöld, `tsc` tiszta): Statisztika átnevezés, főoldali
munkaválasztó, viewport + PWA manifest (orientation portrait), mind a 6 wizard a
`app/(wizard)/munka/*` alatt, közös keret a `components/wizard/`-ban.

**Még hátra:**
- Service worker (offline/teljes PWA) — nincs beállítva.
- Eszközön tesztelés (Android/iOS): fullscreen, orientáció-zár, kamera a wizardökben.
- Nyitott döntés véglegesítése: a főoldal `/` most a munkaválasztó — ha a
  bejelentkezés utáni default más legyen, azt még be lehet állítani.
