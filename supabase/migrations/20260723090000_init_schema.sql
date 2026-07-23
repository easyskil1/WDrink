-- =============================================================================
-- Drink World Győr / WDrink – Alap séma (Fázis 2)
-- Minden készletmozgás egységes movement_log-ba kerül. Készlet mindig
-- alapegységben (darab). Enum értékek ASCII slugok, a UI magyar címkékre mappel.
-- =============================================================================

-- ---- Enum típusok -----------------------------------------------------------

create type location_tipus as enum ('pick', 'raktar', 'puffer', 'karanten');

create type jovedeki_kategoria as enum ('sor', 'bor', 'koztes', 'alkoholtermek');

create type kiszereles_tipus as enum (
  'palack', 'dobozos', 'uveg', 'karton', 'raklap', 'hordo'
);

create type urtartalom_egyseg as enum ('ml', 'l');

create type betetdij_tipus as enum (
  'nincs', 'kotelezo_eldobhato', 'kotelezo_ujrahasznalhato', 'onkentes'
);

create type stock_statusz as enum (
  'puffer', 'betarolva', 'kigyujtve', 'kiadva', 'selejtezve'
);

create type movement_tipus as enum (
  'bevetelezes', 'betarolas', 'kigyujtes', 'kiadas', 'atrarolas', 'selejtezes'
);

create type selejt_ok as enum ('serult', 'lejart', 'hiany', 'egyeb');

create type selejt_forras_lepes as enum (
  'bevetelezes', 'betarolas', 'kigyujtes', 'kiadas'
);

create type user_role as enum ('admin', 'staff');

create type delivery_irany as enum ('bevetelezes', 'kiadas');

-- ---- updated_at trigger függvény --------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- profiles (felhasználók, jogosultság) -----------------------------------

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nev        text,
  role       user_role   not null default 'staff',
  aktiv      boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Új auth user létrejöttekor automatikusan profil is készül (staff role-lal).
-- Az első admin szerepét kézzel/service role-lal kell beállítani (ld. seed).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nev)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nev', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- suppliers (beszállítók) ------------------------------------------------

create table public.suppliers (
  id             uuid primary key default gen_random_uuid(),
  nev            text not null,
  adoszam        text,
  cim            text,
  kapcsolattarto text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id)
);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- ---- locations (raktári helyek) ---------------------------------------------

create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  sor        text not null,
  polc       text not null,
  polcsor    text not null,
  tarhely    text not null,
  -- teljes_kod a négy komponensből generálva, pl. A-01-02-03
  teljes_kod text generated always as (sor || '-' || polc || '-' || polcsor || '-' || tarhely) stored,
  qr_kod     text unique,
  tipus      location_tipus not null default 'raktar',
  aktiv      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  unique (sor, polc, polcsor, tarhely)
);

create unique index locations_teljes_kod_key on public.locations (teljes_kod);

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

-- ---- products (alaptermék) --------------------------------------------------

create table public.products (
  id                       uuid primary key default gen_random_uuid(),
  nev                      text not null,
  kategoria                text,
  gyarto_beszallito_id     uuid references public.suppliers (id) on delete set null,
  leiras                   text,
  alkoholtartalom          numeric(5, 2),           -- %
  jovedeki                 boolean not null default false,
  jovedeki_termekkategoria jovedeki_kategoria,
  kn_kod                   text,                     -- vámtarifaszám (KN-kód)
  fajtakod                 text,                     -- NAV fajtakód
  min_keszlet              integer not null default 0,
  aktiv                    boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users (id)
);

create index products_nev_idx on public.products (nev);
create index products_supplier_idx on public.products (gyarto_beszallito_id);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---- product_units (kiszerelési szintek) ------------------------------------

create table public.product_units (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products (id) on delete cascade,
  kiszereles             kiszereles_tipus not null,
  vonalkod               text unique,               -- EAN, egyedi minden unit közt
  mennyiseg_alapegysegben integer not null check (mennyiseg_alapegysegben > 0),
  netto_urtartalom       numeric(10, 3),            -- csak kijelzés + jövedéki riport
  urtartalom_egyseg      urtartalom_egyseg,
  netto_ar               numeric(12, 2),
  brutto_ar              numeric(12, 2),
  afa_kulcs              numeric(5, 2) not null default 27,
  beszerzesi_ar          numeric(12, 2),
  betetdij_tipus         betetdij_tipus not null default 'nincs',
  betetdij_osszeg        numeric(12, 2) not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index product_units_product_idx on public.product_units (product_id);

create trigger product_units_set_updated_at
  before update on public.product_units
  for each row execute function public.set_updated_at();

-- ---- delivery_notes (szállítólevelek) ---------------------------------------

create table public.delivery_notes (
  id          uuid primary key default gen_random_uuid(),
  irany       delivery_irany not null,
  supplier_id uuid references public.suppliers (id) on delete set null,  -- bevételezésnél
  vevo_nev    text,                                                      -- kiadásnál
  datum       date not null default current_date,
  fenykep_url text,                                                      -- bevételezés, Storage
  pdf_url     text,                                                      -- kiadás, generált PDF
  sorszam     text unique not null,                                      -- szekvenciális azonosító
  ekaer_szam  text,                                                      -- előkészítve, opcionális
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id)
);

create trigger delivery_notes_set_updated_at
  before update on public.delivery_notes
  for each row execute function public.set_updated_at();

-- ---- stock_items (LOT/tétel szintű készlet) ---------------------------------

create table public.stock_items (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products (id),
  product_unit_id        uuid not null references public.product_units (id),
  lot_szam               text,
  lejarat_datum          date,
  location_id            uuid references public.locations (id),  -- NULL = puffer
  mennyiseg_alapegysegben integer not null check (mennyiseg_alapegysegben >= 0),
  statusz                stock_statusz not null default 'puffer',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid references auth.users (id)
);

create index stock_items_product_idx on public.stock_items (product_id);
create index stock_items_location_idx on public.stock_items (location_id);
create index stock_items_statusz_idx on public.stock_items (statusz);
-- FEFO: legkorábbi lejárat előre
create index stock_items_fefo_idx on public.stock_items (lejarat_datum nulls last);

create trigger stock_items_set_updated_at
  before update on public.stock_items
  for each row execute function public.set_updated_at();

-- ---- movement_log (minden készletmozgás egységesen) -------------------------

create table public.movement_log (
  id                  uuid primary key default gen_random_uuid(),
  tipus               movement_tipus not null,
  stock_item_id       uuid references public.stock_items (id),
  mennyiseg           integer not null,                 -- alapegységben
  forras_location_id  uuid references public.locations (id),
  cel_location_id     uuid references public.locations (id),
  selejt_ok           selejt_ok,                        -- csak selejtezésnél
  selejt_forras_lepes selejt_forras_lepes,              -- honnan történt a selejtezés
  delivery_note_id    uuid references public.delivery_notes (id),
  ekaer_szam          text,                             -- előkészítve, opcionális
  user_id             uuid references auth.users (id) default auth.uid(),
  megjegyzes          text,
  created_at          timestamptz not null default now()
);

create index movement_log_tipus_idx on public.movement_log (tipus);
create index movement_log_created_idx on public.movement_log (created_at);
create index movement_log_stock_item_idx on public.movement_log (stock_item_id);

-- ---- company_settings (cégadatok, egysoros) ---------------------------------
-- Jövedéki engedélyszám, FELIR azonosító – számlákon/szállítóleveleken.

create table public.company_settings (
  id                   boolean primary key default true check (id),  -- garantált egy sor
  cegnev               text,
  adoszam              text,
  cim                  text,
  jovedeki_engedelyszam text,
  felir_azonosito      text,
  updated_at           timestamptz not null default now()
);

create trigger company_settings_set_updated_at
  before update on public.company_settings
  for each row execute function public.set_updated_at();
