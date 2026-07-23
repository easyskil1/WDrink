@AGENTS.md

# Deploy / infrastruktúra konfiguráció (Vercel + Supabase)

> Ez a szakasz rögzíti, milyen NEM kódbeli beállítások kellenek a helyes és
> gyors működéshez. Ha új Vercel projekt jön létre, ezeket újra be kell állítani.

## Régió — KRITIKUS a sebességhez

- **Supabase adatbázis: Frankfurt (EU).** Adatrezidencia miatt is EU-ban marad
  (magyar jövedéki/NAV + GDPR).
- **A Vercel szerverfüggvényeknek is `fra1` (Frankfurt) régióban kell futniuk**,
  hogy a Supabase-lekérdezések ne tegyenek transzatlanti kört.
- A Vercel **default régiója `iad1` (USA-East)** — ha ez marad, minden
  oldalbetöltés ~800ms+ (óceánon átküldött lekérdezések miatt).
- **Hobby csomagon a dashboard visszaugratja** a régiót iad1-re, DE a Vercel
  **API elfogadja**:
  ```
  PATCH https://api.vercel.com/v9/projects/{projectId}?teamId={teamId}
  Body: {"serverlessFunctionRegion":"fra1"}
  ```
  (projectId=`prj_tGiPOg60LV26gxT28b4qIucuZKXq`, teamId=`team_TbsJuhtygUW80jxbfJjLYPyd`)
  Utána **redeploy kell** (a régió csak új buildre érvényes).
- `vercel.json`-ban is benne van `"regions": ["fra1"]` — ez Hobby-n önmagában
  NEM elég (az API PATCH a működő út), Pro csomagon viszont érvényesülne.
- Ellenőrzés: az `x-vercel-id` válasz-header közepe mutatja a függvény régióját
  (`fra1::fra1::...` = jó; `fra1::iad1::...` = a függvény még USA-ban fut).

## Auth teljesítmény (kódban, `lib/`)

- A middleware (`lib/supabase/proxy.ts`) és a `lib/auth.ts` **`getClaims()`-t**
  használ, NEM `getUser()`-t. A `getClaims()` a JWT-t lokálisan ellenőrzi
  (a projekt **ES256 aszimmetrikus signing key**-t használ), így nincs hálózati
  kör a Supabase Auth szerverhez minden oldalbetöltésnél.
- `lib/auth.ts` a `React.cache()`-sel requestenként egyszer futtat auth+profil
  lekérdezést (layout és oldal együtt is).

## Környezeti változók (Vercel → Settings → Environment Variables)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` — production és development targetre beállítva.
  (Ha PR preview deployt is használunk, a `preview` targetre is fel kell venni.)

## Érdemes még bekapcsolni (opcionális)

- **Fluid Compute** (Settings → Functions): csökkenti a cold-startot (az első
  kérés jelenleg ~1.3s hidegindításnál). Ingyenes, nem plan-zárolt.
- **Speed Insights / Web Analytics**: provisionálva van, de a kód nincs bekötve
  (`@vercel/speed-insights`, `@vercel/analytics` csomag + komponens a root
  layoutba) — ha kell valós felhasználói perf-monitoring.
