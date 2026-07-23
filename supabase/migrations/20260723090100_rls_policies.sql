-- =============================================================================
-- RLS – Row Level Security szabályok
-- Alapelv: csak bejelentkezett, aktív staff/admin érhet el bármit.
-- profiles: mindenki látja a sajátját; a role kiosztása csak adminnak.
-- =============================================================================

-- ---- Jogosultság-ellenőrző függvények (SECURITY DEFINER, elkerüli a rekurziót)

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.aktiv
      and p.role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.aktiv
      and p.role = 'admin'
  );
$$;

-- ---- RLS engedélyezése minden táblán -----------------------------------------

alter table public.profiles         enable row level security;
alter table public.suppliers        enable row level security;
alter table public.locations        enable row level security;
alter table public.products         enable row level security;
alter table public.product_units    enable row level security;
alter table public.delivery_notes   enable row level security;
alter table public.stock_items      enable row level security;
alter table public.movement_log     enable row level security;
alter table public.company_settings enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- Mindenki olvashatja a saját profilját (ez kell a role-ellenőrzéshez a
-- belépés után), a staff/admin pedig mindenkiét. Módosítás csak adminnak.

create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_staff());

create policy profiles_insert on public.profiles
  for insert with check (public.is_admin());

create policy profiles_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

create policy profiles_delete on public.profiles
  for delete using (public.is_admin());

-- ---- Üzleti táblák: teljes hozzáférés staff/admin számára --------------------
-- (A jövőbeli webshop publikus policy-i külön migrációban jönnek, csak a
--  products/product_units publikus mezőire.)

create policy suppliers_all on public.suppliers
  for all using (public.is_staff()) with check (public.is_staff());

create policy locations_all on public.locations
  for all using (public.is_staff()) with check (public.is_staff());

create policy products_all on public.products
  for all using (public.is_staff()) with check (public.is_staff());

create policy product_units_all on public.product_units
  for all using (public.is_staff()) with check (public.is_staff());

create policy delivery_notes_all on public.delivery_notes
  for all using (public.is_staff()) with check (public.is_staff());

create policy stock_items_all on public.stock_items
  for all using (public.is_staff()) with check (public.is_staff());

create policy movement_log_all on public.movement_log
  for all using (public.is_staff()) with check (public.is_staff());

-- ---- company_settings: olvasás staff, módosítás admin ------------------------

create policy company_settings_select on public.company_settings
  for select using (public.is_staff());

create policy company_settings_write on public.company_settings
  for all using (public.is_admin()) with check (public.is_admin());
