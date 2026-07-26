-- Bevételezés szállítólevél-alapú átalakítása – 1. FÁZIS: séma
-- (claude/TERV_bevetelezes_szallitolevel.md)
--
-- A logisztikai gyakorlatban minden bevételezés a BESZÁLLÍTÓ szállítólevél-
-- számához fűződik. A `sorszam` mindkét irányban generált volt
-- ('KIAD-2026-00001' / 'BEV-2026-00001'); a kiadásnál ez helyes, mert azt a
-- dokumentumot mi állítjuk ki, a bevételezésnél viszont egy olyan papírra
-- hivatkozott, amit nem mi adtunk ki. A beszállító tényleges papírszáma eddig
-- sehol nem volt eltárolva – ezt az oszlopot vezetjük be most.
--
-- A `sorszam` MEGMARAD (unique not null, migrációs kockázat nélkül), de a
-- jelentése lefokozódik belső azonosítóra; a UI-ban a szállítólevél szám az
-- elsődleges.

-- ---- 1. A beszállító papírszáma ---------------------------------------------

alter table public.delivery_notes
  add column if not exists szallitolevel_szam text;

comment on column public.delivery_notes.szallitolevel_szam is
  'A beszállító szállítólevelének száma (bevételezésnél). A papíron szereplő '
  'érték, NEM generált. Kiadásnál NULL – ott a sorszam a mi dokumentumunk száma.';

comment on column public.delivery_notes.sorszam is
  'Belső, generált azonosító (BEV-/KIAD- prefix). Kiadásnál ez a kiállított '
  'dokumentum száma, bevételezésnél csak technikai fogódzó – ott a '
  'szallitolevel_szam az üzleti azonosító.';

-- ---- 2. Egy papír = egy szállítólevél --------------------------------------
-- Ez teszi lehetővé a "hozzáfűzés ugyanahhoz a szállítólevélhez" logikát
-- (find-or-create a create_bevetelezes-ben), és megakadályozza, hogy ugyanaz a
-- beszállítói papír két külön levélként nyíljon meg.
-- Részleges index: a kiadásokat nem érinti (ott a szallitolevel_szam NULL).

create unique index if not exists delivery_notes_bev_szl_uniq
  on public.delivery_notes (supplier_id, szallitolevel_szam)
  where irany = 'bevetelezes';

-- ---- 3. Kötelezőség bevételezésnél -----------------------------------------
-- Felhasználói döntés (2026-07-26): a szállítólevél szám ÉS a beszállító is
-- kötelező bevételezésnél (a "- Beszállító nélkül -" opció megszűnik).
--
-- NOT VALID, mert a 11 meglévő sor (köztük a seed-demo.mjs BEV-2026-001xx
-- sorozata és egy beszállító nélküli, tétel nélküli sor) nem felel meg – azokat
-- nem hamisítjuk meg visszamenőleg kitalált papírszámmal. A NOT VALID csak az
-- új és a MÓDOSÍTOTT sorokra érvényesül, a meglévők érintetlenek maradnak.
-- A kötelezőséget a create_bevetelezes RPC is ellenőrzi (érthető hibaüzenettel).
--
-- Ha később a régi sorok is rendezésre kerülnek:
--   alter table public.delivery_notes validate constraint delivery_notes_bev_kotelezo;

alter table public.delivery_notes
  drop constraint if exists delivery_notes_bev_kotelezo;

alter table public.delivery_notes
  add constraint delivery_notes_bev_kotelezo
  check (
    irany <> 'bevetelezes'
    or (supplier_id is not null and nullif(btrim(szallitolevel_szam), '') is not null)
  )
  not valid;

-- ---- 4. Lista / keresés indexek --------------------------------------------

-- Szállítólevél szám szerinti keresés a webes listán.
create index if not exists delivery_notes_szl_szam_idx
  on public.delivery_notes (szallitolevel_szam);

-- A lista alaprendezése: irány szerint szűrve, dátum szerint csökkenően.
create index if not exists delivery_notes_irany_datum_idx
  on public.delivery_notes (irany, datum desc);

notify pgrst, 'reload schema';
